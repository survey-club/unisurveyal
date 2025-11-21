import arxiv
import time
from typing import List, Dict

class ArxivScraper:
    def __init__(self):
        # ArXiv API rate limit: 3초당 1요청 권장
        self.client = arxiv.Client(
            page_size=100,
            delay_seconds=3.0,  # 요청 간 3초 대기
            num_retries=3  # 실패 시 3번 재시도
        )
        self.last_request_time = 0

    def search_surveys(self, query: str, max_results: int = 500) -> List[Dict]:
        """ArXiv에서 survey 논문 검색 (연관성 순) - 제목에 검색어가 포함된 논문만 반환"""
        # Rate limit 체크 및 대기
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < 3.0:
            time.sleep(3.0 - time_since_last)

        self.last_request_time = time.time()

        # 제목에 검색어(정확한 문구) AND (comprehensive OR survey OR "a review") 포함
        search = arxiv.Search(
            query=f'ti:"{query}" AND (ti:comprehensive OR ti:survey OR ti:"a review")',
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance
        )

        # ArXiv에서 논문 정보 수집
        results = []
        try:
            for paper in self.client.results(search):
                arxiv_id = paper.entry_id.split("/")[-1]
                results.append({
                    "arxiv_id": arxiv_id,
                    "title": paper.title,
                    "abstract": paper.summary,
                    "authors": ", ".join([author.name for author in paper.authors]),
                    "published_date": paper.published.date(),
                    "pdf_url": paper.pdf_url,
                    "categories": ", ".join(paper.categories),
                })
        except Exception as e:
            print(f"Error searching ArXiv: {e}")
            if not results:
                raise

        return results
    
    def search_by_category(self, categories: List[str], max_results: int = 10) -> List[Dict]:
        """카테고리별 검색"""
        category_map = {
            # Core ML/DL
            "딥러닝": "cs.LG",
            "Deep Learning": "cs.LG",
            "머신러닝": "cs.LG",
            "Machine Learning": "cs.LG",
            "강화학습": "cs.LG",
            "Reinforcement Learning": "cs.LG",
            "전이학습": "cs.LG",
            "Transfer Learning": "cs.LG",
            "메타러닝": "cs.LG",
            "Meta Learning": "cs.LG",
            "연합학습": "cs.LG",
            "Federated Learning": "cs.LG",

            # Computer Vision
            "컴퓨터비전": "cs.CV",
            "Computer Vision": "cs.CV",
            "이미지분류": "cs.CV",
            "Image Classification": "cs.CV",
            "객체탐지": "cs.CV",
            "Object Detection": "cs.CV",
            "영상분할": "cs.CV",
            "Image Segmentation": "cs.CV",
            "3D Vision": "cs.CV",
            "3D 비전": "cs.CV",
            "비디오이해": "cs.CV",
            "Video Understanding": "cs.CV",

            # NLP & Language
            "NLP": "cs.CL",
            "자연어처리": "cs.CL",
            "Natural Language Processing": "cs.CL",
            "LLM": "cs.CL",
            "Large Language Models": "cs.CL",
            "기계번역": "cs.CL",
            "Machine Translation": "cs.CL",
            "질의응답": "cs.CL",
            "Question Answering": "cs.CL",
            "텍스트생성": "cs.CL",
            "Text Generation": "cs.CL",
            "감성분석": "cs.CL",
            "Sentiment Analysis": "cs.CL",

            # Generative AI
            "생성모델": "cs.LG",
            "Generative Models": "cs.LG",
            "GAN": "cs.LG",
            "Generative Adversarial Networks": "cs.LG",
            "VAE": "cs.LG",
            "Variational Autoencoders": "cs.LG",
            "Diffusion Models": "cs.LG",
            "확산모델": "cs.LG",

            # Graph & Structure
            "그래프신경망": "cs.LG",
            "Graph Neural Networks": "cs.LG",
            "지식그래프": "cs.AI",
            "Knowledge Graphs": "cs.AI",

            # Audio & Speech
            "음성인식": "eess.AS",
            "Speech Recognition": "eess.AS",
            "음성합성": "eess.AS",
            "Speech Synthesis": "eess.AS",
            "오디오처리": "eess.AS",
            "Audio Processing": "eess.AS",

            # Time Series & Prediction
            "시계열": "stat.ML",
            "Time Series": "stat.ML",
            "예측모델": "stat.ML",
            "Forecasting": "stat.ML",

            # Recommendation & Personalization
            "추천시스템": "cs.IR",
            "Recommender Systems": "cs.IR",
            "협업필터링": "cs.IR",
            "Collaborative Filtering": "cs.IR",

            # Robotics & Control
            "로보틱스": "cs.RO",
            "Robotics": "cs.RO",
            "자율주행": "cs.RO",
            "Autonomous Driving": "cs.RO",
            "제어이론": "cs.SY",
            "Control Theory": "cs.SY",

            # Optimization & Theory
            "최적화": "math.OC",
            "Optimization": "math.OC",
            "신경망이론": "cs.LG",
            "Neural Network Theory": "cs.LG",
            "설명가능AI": "cs.AI",
            "Explainable AI": "cs.AI",

            # Applications
            "의료AI": "cs.LG",
            "Medical AI": "cs.LG",
            "금융AI": "cs.LG",
            "Financial AI": "cs.LG",
            "게임AI": "cs.AI",
            "Game AI": "cs.AI",
            "Edge AI": "cs.LG",
            "엣지AI": "cs.LG",
            "멀티모달": "cs.LG",
            "Multimodal Learning": "cs.LG",

            # General AI
            "AI": "cs.AI"
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

    def search_ai_ml_surveys(self, keywords: List[str], max_results: int = 1000) -> List[Dict]:
        """
        AI/ML 분야 survey 논문 전문 검색

        Args:
            keywords: 검색 키워드 리스트
            max_results: 최대 결과 수

        Returns:
            논문 정보 딕셔너리 리스트
        """
        # Rate limit 체크 및 대기
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < 3.0:
            time.sleep(3.0 - time_since_last)

        self.last_request_time = time.time()

        # AI/ML 관련 카테고리
        ai_categories = ["cs.AI", "cs.LG", "cs.CV", "cs.CL", "cs.NE", "stat.ML"]
        category_query = " OR ".join([f"cat:{cat}" for cat in ai_categories])

        # 키워드 쿼리 생성
        keyword_query = " AND ".join(keywords) if keywords else ""

        # 최종 쿼리: (AI/ML 카테고리) AND (키워드) AND (survey/review)
        if keyword_query:
            final_query = f"({category_query}) AND ({keyword_query}) AND (survey OR review)"
        else:
            final_query = f"({category_query}) AND (survey OR review)"

        search = arxiv.Search(
            query=final_query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance
        )

        # ArXiv에서 논문 정보 수집
        results = []
        try:
            for paper in self.client.results(search):
                arxiv_id = paper.entry_id.split("/")[-1]
                results.append({
                    "arxiv_id": arxiv_id,
                    "title": paper.title,
                    "abstract": paper.summary,
                    "authors": ", ".join([author.name for author in paper.authors]),
                    "published_date": paper.published.date(),
                    "pdf_url": paper.pdf_url,
                    "categories": ", ".join(paper.categories),
                })
        except Exception as e:
            print(f"Error searching AI/ML surveys: {e}")
            if not results:
                raise

        return results

    def search_ml_surveys_for_recommendation(self, max_results: int = 500) -> List[Dict]:
        """
        추천 시스템용 ML/DL Survey 논문 검색
        초록에 'deep learning' 또는 'machine learning' 포함
        제목에 'survey', 'comprehensive', 'a review' 중 하나 포함

        Args:
            max_results: 최대 결과 수

        Returns:
            논문 정보 딕셔너리 리스트
        """
        # Rate limit 체크 및 대기
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < 3.0:
            time.sleep(3.0 - time_since_last)

        self.last_request_time = time.time()

        # 초록에 deep learning OR machine learning
        # AND 제목에 survey OR comprehensive OR "a review"
        search = arxiv.Search(
            query='(abs:"deep learning" OR abs:"machine learning") AND (ti:survey OR ti:comprehensive OR ti:"a review")',
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance
        )

        # ArXiv에서 논문 정보 수집
        results = []
        try:
            for paper in self.client.results(search):
                arxiv_id = paper.entry_id.split("/")[-1]
                results.append({
                    "arxiv_id": arxiv_id,
                    "title": paper.title,
                    "abstract": paper.summary,
                    "authors": ", ".join([author.name for author in paper.authors]),
                    "published_date": paper.published.date(),
                    "pdf_url": paper.pdf_url,
                    "categories": ", ".join(paper.categories),
                })
        except Exception as e:
            print(f"Error searching ML surveys for recommendation: {e}")
            if not results:
                raise

        return results

    def estimate_reading_time(self, abstract: str) -> Dict[str, int]:
        """
        추상 길이 기반 읽기 시간 추정 (분 단위)

        Args:
            abstract: 논문 초록

        Returns:
            초급/중급/고급자별 예상 읽기 시간 (분)
        """
        # 초록 단어 수
        word_count = len(abstract.split())

        # 초록 단어 수로 페이지 수 추정 (survey 논문은 초록 단어당 약 0.8페이지)
        # 예: 200단어 초록 = 약 160페이지, 300단어 = 240페이지
        estimated_pages = max(15, min(60, word_count * 0.8))

        # 페이지당 읽기 시간 (분)
        # 초급: 20분/페이지, 중급: 12분/페이지, 고급: 8분/페이지
        beginner_time = int(estimated_pages * 20)
        intermediate_time = int(estimated_pages * 12)
        advanced_time = int(estimated_pages * 8)

        return {
            "beginner": beginner_time,
            "intermediate": intermediate_time,
            "advanced": advanced_time,
        }