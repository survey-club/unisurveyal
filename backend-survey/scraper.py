import arxiv
from typing import List, Dict
import re
from datetime import datetime

class ArxivScraper:
    def __init__(self):
        self.client = arxiv.Client()
    
    def search_surveys(self, query: str, max_results: int = 10) -> List[Dict]:
        """ArXiv에서 survey 논문 검색"""
        search = arxiv.Search(
            query=f"{query} AND (survey OR review)",
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance
        )
        
        results = []
        for paper in self.client.results(search):
            results.append({
                "arxiv_id": paper.entry_id.split("/")[-1],
                "title": paper.title,
                "abstract": paper.summary,
                "authors": ", ".join([author.name for author in paper.authors]),
                "published_date": paper.published.date(),
                "pdf_url": paper.pdf_url,
                "categories": ", ".join(paper.categories),
            })
        
        return results
    
    def search_by_category(self, categories: List[str], max_results: int = 10) -> List[Dict]:
        """카테고리별 검색"""
        category_map = {
            "딥러닝": "cs.LG",
            "컴퓨터비전": "cs.CV",
            "NLP": "cs.CL",
            "AI": "cs.AI",
            "머신러닝": "stat.ML",
            "로봇": "cs.RO",
            "시계열": "stat.ME"
        }
        
        cat_queries = [category_map.get(cat, "cs.AI") for cat in categories]
        query = " OR ".join([f"cat:{cat}" for cat in cat_queries])
        
        search = arxiv.Search(
            query=f"({query}) AND (survey OR review)",
            max_results=max_results,
            sort_by=arxiv.SortCriterion.SubmittedDate
        )
        
        results = []
        for paper in self.client.results(search):
            results.append({
                "arxiv_id": paper.entry_id.split("/")[-1],
                "title": paper.title,
                "abstract": paper.summary,
                "authors": ", ".join([author.name for author in paper.authors]),
                "published_date": paper.published.date(),
                "pdf_url": paper.pdf_url,
                "categories": ", ".join(paper.categories),
            })
        
        return results
    
    def estimate_reading_time(self, abstract: str) -> Dict[str, int]:
        """추상 길이 기반 읽기 시간 추정 (분 단위)"""
        word_count = len(abstract.split())
        page_estimate = word_count / 250  # 평균 250 단어/페이지
        
        # Survey는 보통 20-50 페이지
        estimated_pages = max(20, min(50, page_estimate * 10))
        
        return {
            "beginner": int(estimated_pages * 15),  # 15분/페이지
            "intermediate": int(estimated_pages * 10),  # 10분/페이지
            "advanced": int(estimated_pages * 7),  # 7분/페이지
        }