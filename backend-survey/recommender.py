"""
TF-IDF 및 Cosine Similarity 기반 논문 추천 시스템
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Dict, Tuple
import joblib
import os


class SurveyRecommender:
    def __init__(self):
        """
        TF-IDF 기반 추천 시스템 초기화
        """
        self.vectorizer = TfidfVectorizer(
            max_features=1000,  # 최대 feature 수
            stop_words='english',  # 영어 불용어 제거
            ngram_range=(1, 2),  # unigram + bigram
            min_df=1,  # 최소 문서 빈도
            max_df=0.8  # 최대 문서 빈도 (너무 흔한 단어 제거)
        )
        self.tfidf_matrix = None
        self.paper_ids = []

    def prepare_text(self, title: str, abstract: str, keywords: str = "") -> str:
        """
        논문의 제목, 초록, 키워드를 결합하여 하나의 텍스트로 만듦
        제목과 키워드에 가중치 부여 (반복)

        Args:
            title: 논문 제목
            abstract: 논문 초록
            keywords: 논문 키워드 (콤마로 구분된 문자열)

        Returns:
            결합된 텍스트
        """
        # 제목과 키워드에 가중치 부여 (3번 반복)
        weighted_title = " ".join([title] * 3)
        weighted_keywords = " ".join([keywords] * 2) if keywords else ""

        combined = f"{weighted_title} {abstract} {weighted_keywords}"
        return combined.strip()

    def fit(self, papers: List[Dict]) -> None:
        """
        논문 데이터로 TF-IDF 모델 학습

        Args:
            papers: 논문 정보 딕셔너리 리스트
                    각 딕셔너리는 'id', 'title', 'abstract', 'keywords' 키를 포함
        """
        if not papers:
            raise ValueError("논문 데이터가 비어있습니다")

        # 논문 ID 저장
        self.paper_ids = [p['id'] for p in papers]

        # 텍스트 준비
        texts = [
            self.prepare_text(
                p.get('title', ''),
                p.get('abstract', ''),
                p.get('keywords', '')
            )
            for p in papers
        ]

        # TF-IDF 벡터화
        self.tfidf_matrix = self.vectorizer.fit_transform(texts)

    def recommend(
        self,
        user_read_papers: List[Dict],
        all_papers: List[Dict],
        top_n: int = 10
    ) -> List[Tuple[int, float]]:
        """
        사용자가 읽은 논문을 기반으로 유사한 논문 추천

        Args:
            user_read_papers: 사용자가 읽은 논문 리스트
            all_papers: 전체 논문 리스트 (추천 후보)
            top_n: 추천할 논문 개수

        Returns:
            (논문 ID, 유사도 점수) 튜플 리스트, 유사도 내림차순 정렬
        """
        if not user_read_papers:
            return []

        if not all_papers:
            return []

        # 전체 논문으로 모델 학습
        self.fit(all_papers)

        # 사용자가 읽은 논문들의 평균 벡터 계산
        user_texts = [
            self.prepare_text(
                p.get('title', ''),
                p.get('abstract', ''),
                p.get('keywords', '')
            )
            for p in user_read_papers
        ]

        user_vectors = self.vectorizer.transform(user_texts)
        user_profile = np.mean(user_vectors.toarray(), axis=0).reshape(1, -1)

        # 모든 논문과의 유사도 계산
        similarities = cosine_similarity(user_profile, self.tfidf_matrix)[0]

        # 논문 ID와 유사도를 함께 저장
        paper_similarities = list(zip(self.paper_ids, similarities))

        # 이미 읽은 논문 제외
        read_paper_ids = {p['id'] for p in user_read_papers}
        paper_similarities = [
            (pid, sim) for pid, sim in paper_similarities
            if pid not in read_paper_ids
        ]

        # 유사도 내림차순 정렬
        paper_similarities.sort(key=lambda x: x[1], reverse=True)

        # 상위 N개 반환
        return paper_similarities[:top_n]

    def recommend_by_interest(
        self,
        interest_fields: List[str],
        all_papers: List[Dict],
        top_n: int = 10
    ) -> List[Tuple[int, float]]:
        """
        관심 분야 기반 논문 추천 (초기 추천용)

        Args:
            interest_fields: 사용자 관심 분야 키워드 리스트
            all_papers: 전체 논문 리스트
            top_n: 추천할 논문 개수

        Returns:
            (논문 ID, 유사도 점수) 튜플 리스트
        """
        if not interest_fields or not all_papers:
            return []

        # 전체 논문으로 모델 학습
        self.fit(all_papers)

        # 관심 분야를 하나의 텍스트로 결합
        interest_text = " ".join(interest_fields)

        # 관심 분야 벡터화
        interest_vector = self.vectorizer.transform([interest_text])

        # 모든 논문과의 유사도 계산
        similarities = cosine_similarity(interest_vector, self.tfidf_matrix)[0]

        # 논문 ID와 유사도 결합
        paper_similarities = list(zip(self.paper_ids, similarities))

        # 유사도 내림차순 정렬
        paper_similarities.sort(key=lambda x: x[1], reverse=True)

        return paper_similarities[:top_n]

    def save_model(self, filepath: str) -> None:
        """
        학습된 모델을 파일로 저장

        Args:
            filepath: 저장할 파일 경로
        """
        model_data = {
            'vectorizer': self.vectorizer,
            'tfidf_matrix': self.tfidf_matrix,
            'paper_ids': self.paper_ids
        }
        joblib.dump(model_data, filepath)

    def load_model(self, filepath: str) -> None:
        """
        저장된 모델 로드

        Args:
            filepath: 모델 파일 경로
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {filepath}")

        model_data = joblib.load(filepath)
        self.vectorizer = model_data['vectorizer']
        self.tfidf_matrix = model_data['tfidf_matrix']
        self.paper_ids = model_data['paper_ids']
