"""
키워드 추출 모듈
YAKE(Yet Another Keyword Extractor)를 사용하여 논문 초록에서 핵심 키워드 추출
"""
import yake
from typing import List


class KeywordExtractor:
    def __init__(self):
        """
        YAKE 키워드 추출기 초기화
        - language: 언어 설정 (en = 영어)
        - max_ngram_size: 최대 n-gram 크기
        - deduplication_threshold: 중복 제거 임계값
        - numOfKeywords: 추출할 키워드 수
        """
        self.extractor = yake.KeywordExtractor(
            lan="en",
            n=3,  # unigram, bigram, trigram
            dedupLim=0.9,
            top=10,
            features=None
        )

    def extract_keywords(self, text: str, top_n: int = 3) -> List[str]:
        """
        텍스트에서 상위 N개의 키워드 추출

        Args:
            text: 키워드를 추출할 텍스트
            top_n: 추출할 키워드 수 (기본값: 3)

        Returns:
            추출된 키워드 리스트
        """
        if not text or not text.strip():
            return []

        try:
            # YAKE로 키워드 추출
            keywords = self.extractor.extract_keywords(text)

            # 점수가 낮을수록 좋은 키워드 (YAKE 특성)
            # (keyword, score) 형태로 반환되므로 keyword만 추출
            top_keywords = [kw[0] for kw in keywords[:top_n]]

            return top_keywords

        except Exception as e:
            print(f"키워드 추출 오류: {e}")
            return []

    def extract_from_title_and_abstract(
        self, title: str, abstract: str, top_n: int = 3
    ) -> List[str]:
        """
        제목과 초록을 결합하여 키워드 추출
        제목에 가중치를 주기 위해 제목을 2번 반복

        Args:
            title: 논문 제목
            abstract: 논문 초록
            top_n: 추출할 키워드 수

        Returns:
            추출된 키워드 리스트
        """
        # 제목에 가중치 부여 (제목을 2번 반복)
        combined_text = f"{title} {title} {abstract}"
        return self.extract_keywords(combined_text, top_n)
