"""FastAPI entrypoint for EnviroHub Pro AI endpoints."""

from __future__ import annotations

import logging
import os
import shutil
import tempfile
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from app.ai.funding import run_funding_lookup
from app.ai.general import run_general_assistant
from app.ai.regulatory import run_regulatory_lookup
from app.analyzer import DataAnalyzer
from app.config import Settings, get_settings
from app.models.request_models import PromptRequest
from app.models.response_models import AIResponse
from app.services.gemini_client import GeminiClient, GeminiServiceError
from app.services.scraper_service import scraper_service
from app.services.expert_system import expert_system

logger = logging.getLogger("envirohubpro")


def _configure_logging(log_level: str) -> None:
    """Initialize process-wide logging once."""

    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def get_gemini_client(settings: Settings = Depends(get_settings)) -> GeminiClient:
    """Dependency for configured Gemini client."""

    return GeminiClient(settings=settings)


def create_app() -> FastAPI:
    """Application factory for runtime and tests."""

    settings = get_settings()
    _configure_logging(settings.log_level)

    fastapi_app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="AI-powered environmental regulatory and funding lookup API",
    )

    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @fastapi_app.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        """Liveness endpoint."""

        return {"status": "ok", "service": settings.app_name}

    @fastapi_app.post("/ai/regulations", response_model=AIResponse, tags=["ai"])
    async def regulations_lookup(
        payload: PromptRequest,
        client: GeminiClient = Depends(get_gemini_client),
    ) -> AIResponse:
        """Analyze regulatory prompts and return compliance guidance."""

        try:
            answer, sources = await run_regulatory_lookup(client, payload.prompt)
        except GeminiServiceError as exc:
            logger.error("Regulatory endpoint failed: %s", exc)
            raise HTTPException(status_code=exc.status_code,
                                detail=str(exc)) from exc
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unhandled regulatory endpoint error")
            raise HTTPException(
                status_code=500, detail="Internal server error") from exc

        return AIResponse(answer=answer, sources=sources, model="gemini")

    @fastapi_app.post("/ai/funding", response_model=AIResponse, tags=["ai"])
    async def funding_lookup(
        payload: PromptRequest,
        client: GeminiClient = Depends(get_gemini_client),
    ) -> AIResponse:
        """Analyze funding prompts and return grant opportunities."""

        try:
            answer, sources = await run_funding_lookup(client, payload.prompt)
        except GeminiServiceError as exc:
            logger.error("Funding endpoint failed: %s", exc)
            raise HTTPException(status_code=exc.status_code,
                                detail=str(exc)) from exc
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unhandled funding endpoint error")
            raise HTTPException(
                status_code=500, detail="Internal server error") from exc

        return AIResponse(answer=answer, sources=sources, model="gemini")

    @fastapi_app.post("/ai/general", response_model=AIResponse, tags=["ai"])
    async def general_assistant(
        payload: PromptRequest,
        client: GeminiClient = Depends(get_gemini_client),
    ) -> AIResponse:
        """Handle mixed regulatory and funding prompts."""

        try:
            answer, sources = await run_general_assistant(client, payload.prompt)
        except GeminiServiceError as exc:
            logger.error("General endpoint failed: %s", exc)
            raise HTTPException(status_code=exc.status_code,
                                detail=str(exc)) from exc
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unhandled general endpoint error")
            raise HTTPException(
                status_code=500, detail="Internal server error") from exc

        return AIResponse(answer=answer, sources=sources, model="gemini")

    @fastapi_app.post("/ai/analyze", tags=["ai"])
    async def analyze_data(
        file: UploadFile | None = File(None),
        prompt: str | None = Form(None),
        analysis_type: str = Form("emissions"),
        custom_domains: str | None = Form(None),
        client: GeminiClient = Depends(get_gemini_client)
    ) -> dict[str, Any]:
        """
        Analyze and clean data from a binary file OR raw text from frontend.
        """
        analyzer = DataAnalyzer()
        temp_file_path = None
        
        try:
            if file and file.filename:
                # Handle binary file upload
                suffix = os.path.splitext(file.filename)[1]
                if not suffix:
                    suffix = ".csv"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tf:
                    shutil.copyfileobj(file.file, tf)
                    temp_file_path = tf.name
                
                analyzer.load_data(temp_file_path)
            elif prompt:
                # Handle raw text paste
                content = prompt.strip()
                if "\n" in content or not os.path.exists(content):
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv", mode="w", encoding="utf-8") as tf:
                        tf.write(content)
                        temp_file_path = tf.name
                    analyzer.load_data(temp_file_path)
                else:
                    analyzer.load_data(content)
                    temp_file_path = content
            else:
                raise ValueError("You must provide either an uploaded file or raw text.")

            analyzer.clean_data()
            analyzer.transform_data()
            
            # Send data to Gemini for analysis
            logger.info("Executing Gemini Data Analysis for type: %s", analysis_type)
            data_csv = analyzer.data.to_csv(index=False)
            
            # Prevent overly massive files from breaking the context window
            # Approx 5000 chars should easily fit, but if they upload a 20k row CSV we should truncate
            # Gemini 1.5 Pro has a massive token limit but we should be reasonable
            # we will pass the whole thing unless it's over 100k characters for safety.
            if len(data_csv) > 100000:
                data_csv = data_csv[:100000] + "\n... (Data truncated for AI safety limit) ..."
            
            # Use factual scraper for exact citations bypassing LLM
            search_keywords = f"acceptable {analysis_type} regulatory limits"
            analyte_col = "analyte" if "analyte" in analyzer.data.columns else ("Analyte" if "Analyte" in analyzer.data.columns else None)
            
            if analyte_col:
                analytes = analyzer.data[analyte_col].dropna().unique().tolist()
                if analytes:
                    term_map = {
                        "emissions": "emission limits",
                        "air": "air quality standards",
                        "water": "water quality standards",
                        "soil": "soil screening levels",
                        "asbestos": "exposure limits",
                        "general": "regulatory limits"
                    }
                    search_keywords = f"{' '.join(analytes[:3])} {term_map.get(analysis_type, 'limits')}"
                    
            domain_list = None
            if custom_domains and custom_domains.strip():
                domain_list = [d.strip() for d in custom_domains.split(",") if d.strip()]
                    
            custom_documents = None
            exact_citations = []
            
            if domain_list:
                # Direct URL override: Fetch full documents to map row-by-row
                custom_documents = scraper_service.fetch_custom_documents(domain_list)
            else:
                # Default behavior: Search DuckDuckGo
                exact_citations = scraper_service.search_exact_citations(
                    keywords=search_keywords, 
                    domains=domain_list,
                    max_results=4
                )
            
            # Non-AI Deterministic Expert System execution for Section 2
            parsed_records = analyzer.data.to_dict(orient="records")
            expert_insights = expert_system.analyze_dataset(
                data_records=parsed_records, 
                scraped_citations=exact_citations, 
                analysis_type=analysis_type,
                custom_domains=domain_list,
                custom_documents=custom_documents
            )
            
            md_content = "AI generation pending..."
            try:
                md_content = await client.generate_analysis_report(
                    analysis_type=analysis_type,
                    dataset_text=data_csv
                )
            except GeminiServiceError as e:
                logger.warning("Gemini AI unavailable (%s). Falling back gracefully.", str(e))
                md_content = f"### Secondary AI Companion Unavailable\n\n*The AI Model is currently experiencing high demand or is temporarily offline.* \n\n**Good news:** Our primary factual tool successfully extracted the exact limits from verified sources. Please refer strictly to your Verified Regulatory Sources above."
            
            # Clean up temp file safely
            if temp_file_path and (not prompt or temp_file_path != prompt) and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except OSError:
                    pass

            return {
                "status": "success",
                "filename": file.filename if file else temp_file_path,
                "content": md_content,
                "exact_citations": exact_citations,
                "expert_insights": expert_insights,
                "data": parsed_records,
            }
        except Exception as exc:
            if temp_file_path and (not prompt or temp_file_path != prompt) and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except OSError:
                    pass
            logger.error("Data analysis failed: %s", exc)
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @fastapi_app.post("/ai/scrape/stream", tags=["ai"])
    async def scrape_data_stream(
        file: UploadFile | None = File(None),
        prompt: str | None = Form(None),
        analysis_type: str = Form("emissions"),
        custom_domains: str | None = Form(None),
    ):
        """
        Stream scraper insights row-by-row for the dataset.
        """
        analyzer = DataAnalyzer()
        temp_file_path = None
        
        try:
            if file and file.filename:
                suffix = os.path.splitext(file.filename)[1] or ".csv"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tf:
                    shutil.copyfileobj(file.file, tf)
                    temp_file_path = tf.name
                analyzer.load_data(temp_file_path)
            elif prompt:
                content = prompt.strip()
                if "\n" in content or not os.path.exists(content):
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv", mode="w", encoding="utf-8") as tf:
                        tf.write(content)
                        temp_file_path = tf.name
                    analyzer.load_data(temp_file_path)
                else:
                    analyzer.load_data(content)
                    temp_file_path = content
            else:
                raise ValueError("You must provide either an uploaded file or raw text.")

            analyzer.clean_data()
            analyzer.transform_data()
            parsed_records = analyzer.data.to_dict(orient="records")

            domain_list = None
            if custom_domains and custom_domains.strip():
                domain_list = [d.strip() for d in custom_domains.split(",") if d.strip()]
                    
            def event_stream():
                try:
                    for insight_json in expert_system.analyze_dataset_stream(
                        data_records=parsed_records, 
                        scraped_citations=[], 
                        analysis_type=analysis_type,
                        custom_domains=domain_list,
                        custom_documents=None
                    ):
                        yield f"data: {insight_json}\n\n"
                except Exception as e:
                    logger.error(f"Streaming error: {e}")
                    yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
                finally:
                    if temp_file_path and (not prompt or temp_file_path != prompt) and os.path.exists(temp_file_path):
                        try:
                            os.remove(temp_file_path)
                        except OSError:
                            pass

            from fastapi.responses import StreamingResponse
            return StreamingResponse(event_stream(), media_type="text/event-stream")
        except Exception as exc:
            if temp_file_path and (not prompt or temp_file_path != prompt) and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except OSError:
                    pass
            logger.error("Scraper streaming failed: %s", exc)
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    return fastapi_app


app = create_app()
