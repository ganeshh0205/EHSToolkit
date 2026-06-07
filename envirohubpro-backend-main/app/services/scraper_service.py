import logging
import re
import os
import tempfile
from typing import List, Dict
import urllib.parse
from bs4 import BeautifulSoup
import httpx

logger = logging.getLogger(__name__)

class ScraperService:
    def __init__(self):
        self.default_domains = ["epa.gov", "osha.gov", "federalregister.gov"]
        self.jina_base = "https://r.jina.ai/"
        
    def _build_query(self, keywords: str, domains: List[str]) -> str:
        if not domains:
            domains = self.default_domains
        site_filters = " OR ".join([f"site:{d}" for d in domains])
        return f"{keywords} ({site_filters})"

    def _native_search(self, query: str, max_results: int = 3) -> List[Dict[str, str]]:
        hits = []
        try:
            from ddgs import DDGS
            with DDGS() as ddgs:
                results = ddgs.text(query, max_results=max_results)
                for item in results:
                    hits.append({
                        "href": item.get("href"),
                        "title": item.get("title"),
                        "body": item.get("body", "")
                    })
        except Exception as e:
            logger.error(f"DDGS Search failed: {e}")
        return hits

    def _fetch_jina_markdown(self, url: str) -> str | None:
        jina_url = f"{self.jina_base}{url}"
        headers = {
            "Accept": "text/markdown"
        }
        try:
            with httpx.Client(headers=headers, timeout=25.0, follow_redirects=True) as client:
                response = client.get(jina_url, headers=headers, timeout=15.0)
                response.raise_for_status()
                text = response.text
                if "Markdown Content:" in text:
                    text = text.split("Markdown Content:", 1)[1].strip()
                return text
        except Exception as e:
            logger.warning(f"Jina failed to extract {url}: {e}")
            return None

    def _fetch_pdf_content(self, url: str) -> str | None:
        try:
            import pdfplumber
        except ImportError:
            logger.warning("pdfplumber not installed, skipping direct PDF parse.")
            return None
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        try:
            with httpx.Client(headers=headers, timeout=30.0, follow_redirects=True) as client:
                res = client.get(url)
                res.raise_for_status()
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tf:
                    tf.write(res.content)
                    tf_path = tf.name
            text_blocks = []
            with pdfplumber.open(tf_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_blocks.append(text.replace('\n', ' \n\n'))
            try:
                os.remove(tf_path)
            except OSError:
                pass
            if text_blocks:
                return "\n\n".join(text_blocks)
            return None
        except Exception as e:
            logger.error(f"Failed to fetch or parse PDF from {url}: {e}")
            return None

    def fetch_custom_documents(self, urls: List[str]) -> Dict[str, str]:
        docs = {}
        for url in urls:
            if url.lower().endswith('.pdf'):
                markdown = self._fetch_pdf_content(url)
            else:
                markdown = self._fetch_jina_markdown(url)
            if markdown:
                docs[url] = markdown
        return docs

    def _clean_text(self, text: str) -> str:
        text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
        text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
        text = re.sub(r'[*_#`]', '', text) 
        return re.sub(r'\s+', ' ', text).strip()

    def _score_paragraph(self, text: str, keywords: str, analysis_type: str = "general") -> int:
        text_lower = text.lower()
        score = 0
        search_terms = keywords.lower().replace("(", "").replace(")", "").split(" ")
        chemical_match = False
        for term in search_terms:
            if len(term) > 1:
                if len(term) <= 3:
                    if re.search(r'\b' + re.escape(term) + r'\b', text_lower):
                        score += 10
                        chemical_match = True
                else:
                    if term in text_lower:
                        score += 5
                        chemical_match = True
        if not chemical_match:
            return 0
        reg_words = ["limit", "standard", "pel", "twa", "exceed", "maximum", "concentration", "ppm", "mg/m", "compliance", "emission", "rule", "mcl", "rsl", "ssl", "mg/l", "ug/l", "mg/kg", "ug/kg", "water", "soil", "effluent"]
        for w in reg_words:
            if w in text_lower:
                score += 3
                
        context_words = []
        if analysis_type == "water":
            context_words = ["water", "mcl", "effluent", "aquatic", "drinking", "discharge"]
        elif analysis_type == "soil":
            context_words = ["soil", "rsl", "sediment", "land", "remediation", "mg/kg"]
        elif analysis_type in ["emissions", "air"]:
            context_words = ["air", "emissions", "stack", "ppm", "pel", "twa", "naaqs", "vent"]
        elif analysis_type == "asbestos":
            context_words = ["asbestos", "f/cc", "fibers", "lead", "ug/dl", "mg/cm2", "abatement", "clearance"]
            
        for cw in context_words:
            if cw in text_lower:
                score += 20
                
        if any(char.isdigit() for char in text_lower):
            score += 3
        if any(bad in text_lower for bad in ["skip to content", "menu", "contact us", "about us", "home - ", "omb approval", "required questions", "stars", "did you visit", "tell us why"]):
            score -= 50
        return score

    def search_exact_citations(self, keywords: str, domains: List[str] = None, max_results: int = 3) -> List[Dict[str, str]]:
        results = []
        try:
            direct_urls = []
            if domains:
                for d in domains:
                    if d.startswith("http://") or d.startswith("https://"):
                        direct_urls.append(d)
                    else:
                        direct_urls.append("https://" + d)
            search_hits = []
            if direct_urls:
                for url in direct_urls:
                    search_hits.append({
                        "href": url,
                        "title": "User-Targeted Regulatory Document",
                        "body": "Exact Website Deep Paragraph Extraction"
                    })
            else:
                query = self._build_query(keywords, None)
                search_hits = self._native_search(query, max_results=max_results)
            for hit in search_hits:
                url = hit.get('href')
                title = hit.get('title')
                snippet = hit.get('body')
                if not url:
                    continue
                markdown_dump = self._fetch_jina_markdown(url)
                exact_context = None
                if markdown_dump:
                    paragraphs = markdown_dump.split('\n\n')
                    scored_paras = []
                    for p in paragraphs:
                        clean_para = self._clean_text(p)
                        if len(clean_para) < 20:
                            continue
                        score = self._score_paragraph(clean_para, keywords)
                        if score > 0:
                            scored_paras.append((score, p))
                    if scored_paras:
                        scored_paras.sort(key=lambda x: x[0], reverse=True)
                        top_paras = [p[1] for p in scored_paras[:1]]
                        exact_context = "\n\n".join(top_paras)
                    else:
                        if direct_urls and len(paragraphs) > 0:
                            fallback_paras = [p for p in paragraphs if len(self._clean_text(p)) > 50][:3]
                            exact_context = "\n\n... ".join(fallback_paras) if fallback_paras else snippet
                        else:
                            exact_context = snippet
                else:
                    exact_context = snippet
                if exact_context:
                    exact_context = re.sub(r'(\*\*.*?\*\*)([A-Za-z0-9])', r'\1 \2', exact_context)
                results.append({
                    "title": title,
                    "url": url,
                    "exact_excerpt": exact_context,
                    "source_domain": url.split("//")[-1].split("/")[0]
                })
        except Exception as e:
            logger.error(f"Scraper service encountered error: {e}")
        return results

scraper_service = ScraperService()
