import React, { useState, useEffect } from "react";
import "../App.css";

/**
 * 파일 분석 로딩 모달
 * - 3단계 로딩 메시지 표시
 * - 3~5초 랜덤 시간 동안 진행
 */

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.75)",
  zIndex: 2001,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle = {
  width: "min(400px, calc(100vw - 32px))",
  background: "#15151f",
  color: "#fff",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 12,
  padding: "32px 24px",
  textAlign: "center",
};

const spinnerStyle = {
  width: "48px",
  height: "48px",
  border: "4px solid rgba(255, 255, 255, 0.1)",
  borderTop: "4px solid #00ff99",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  margin: "0 auto 24px",
};

const stepStyle = {
  marginTop: 16,
  fontSize: 14,
  color: "rgba(255, 255, 255, 0.7)",
  minHeight: 20,
};

const activeStepStyle = {
  color: "#00ff99",
  fontWeight: 600,
};

const completedStepStyle = {
  color: "rgba(255, 255, 255, 0.5)",
};

export default function LoadingModal({ isOpen, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const steps = [
    "파일 분석 중...",
    "적용 조건 검수 중...",
    "검증 결과 생성 중...",
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setCompletedSteps([]);
      return;
    }

    // 3~5초 사이 랜덤 시간 (밀리초)
    const totalTime = Math.random() * 2000 + 3000; // 3000ms ~ 5000ms
    const stepTime = totalTime / steps.length;

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        setCompletedSteps((prev) => [...prev, stepIndex]);
        stepIndex++;
        setCurrentStep(stepIndex);
      } else {
        // 마지막 단계 완료
        setCompletedSteps((prev) => [...prev, stepIndex]);
        clearInterval(interval);
        // 약간의 딜레이 후 완료 콜백 호출
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={spinnerStyle} />
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          파일 처리 중
        </div>
        <div style={stepStyle}>
          {steps.map((step, index) => (
            <div
              key={index}
              style={{
                ...stepStyle,
                ...(completedSteps.includes(index)
                  ? completedStepStyle
                  : index === currentStep
                  ? activeStepStyle
                  : {}),
                marginTop: index === 0 ? 0 : 12,
              }}
            >
              {completedSteps.includes(index) ? "✓ " : index === currentStep ? "⟳ " : "○ "}
              {step}
            </div>
          ))}
        </div>
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
