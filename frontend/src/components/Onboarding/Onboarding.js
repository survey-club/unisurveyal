import React, { useState } from 'react';
import './Onboarding.css';

function Onboarding({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '🎉 UniSurveyal에 오신 것을 환영합니다!',
      content: 'AI/ML Survey 논문 추천 플랫폼에서 연구를 시작해보세요.',
      image: '📚'
    },
    {
      title: '📖 논문 추가하기',
      content: '상단의 "새 논문 추가하기" 버튼을 클릭하여 관심있는 논문을 검색하거나 추천받을 수 있습니다.',
      image: '➕'
    },
    {
      title: '✨ 개인화 추천',
      content: '5개 이상의 논문을 읽으면 TF-IDF + Cosine Similarity 기반의 개인화 추천을 받을 수 있습니다.',
      image: '🤖'
    },
    {
      title: '⭐ 즐겨찾기',
      content: '중요한 논문은 별표를 눌러 즐겨찾기에 추가하고, 필터로 쉽게 찾아볼 수 있습니다.',
      image: '⭐'
    },
    {
      title: '📊 스트릭 기록',
      content: '매일 논문을 읽으면 GitHub처럼 스트릭이 쌓입니다. 꾸준한 학습 습관을 만들어보세요!',
      image: '🔥'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('hasSeenOnboarding', 'true');
      onClose();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <button className="onboarding-close" onClick={handleSkip}>✕</button>

        <div className="onboarding-content">
          <div className="onboarding-image">{step.image}</div>
          <h2>{step.title}</h2>
          <p>{step.content}</p>
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-dots">
            {steps.map((_, index) => (
              <span
                key={index}
                className={`dot ${index === currentStep ? 'active' : ''}`}
              />
            ))}
          </div>

          <div className="onboarding-actions">
            {currentStep > 0 && (
              <button className="btn-onboarding btn-prev" onClick={() => setCurrentStep(currentStep - 1)}>
                이전
              </button>
            )}
            <button className="btn-onboarding btn-next" onClick={handleNext}>
              {currentStep === steps.length - 1 ? '시작하기' : '다음'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
