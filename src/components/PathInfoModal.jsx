import React from "react";
import "../App.css";

/**
 * HdMap-validation용 "표시 전용" PathInfoModal
 * - 기존 hdMap 프론트의 PathInfoModal UX를 가져오되,
 *   store/turf/proj4 같은 의존성 없이 "계산된 결과"를 props로 주입받아 표시합니다.
 *
 * ✅ 원칙(검증 페이지):
 * - 계산(평가)은 별도 모듈/서비스에서 수행
 * - 이 컴포넌트는 결과를 보여주는 View 역할만 담당 (CLEAN/단일책임)
 */

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.55)",
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle = {
  width: "min(900px, calc(100vw - 32px))",
  maxHeight: "min(700px, calc(100vh - 32px))",
  overflow: "auto",
  background: "#15151f",
  color: "#fff",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 12,
  padding: 18,
};

const headerRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 10,
};

const closeButtonStyle = {
  border: "1px solid rgba(255, 255, 255, 0.18)",
  background: "rgba(255, 255, 255, 0.06)",
  color: "#fff",
  borderRadius: 8,
  padding: "8px 10px",
  cursor: "pointer",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const cardStyle = {
  border: "1px solid rgba(255, 255, 255, 0.12)",
  background: "rgba(255, 255, 255, 0.04)",
  borderRadius: 10,
  padding: 12,
};

const kvStyle = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: 8,
  fontSize: 13,
  lineHeight: 1.4,
};

function safeNumber(n, digits = 3) {
  if (typeof n !== "number" || Number.isNaN(n)) return "-";
  return n.toFixed(digits);
}

function KVRow({ k, v, highlight = false, danger = false }) {
  const color = danger ? "#ff6666" : highlight ? "#00ff99" : "rgba(255,255,255,0.95)";
  return (
    <>
      <div style={{ color: "rgba(255,255,255,0.7)" }}>{k}</div>
      <div style={{ color, fontWeight: highlight || danger ? "bold" : "normal" }}>
        {v}
      </div>
    </>
  );
}

export default function PathInfoModal({
  isOpen,
  onClose,
  // 아래 값들은 "검증 결과"를 외부에서 계산해서 넣어주는 형태를 권장합니다.
  measurementInfo,
  pathInfo,
  coverageInfo,
  parallelismInfo,
  spacingInfo,
  options,
}) {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={modalStyle}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div style={headerRowStyle}>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>
              영역/경로 검증 정보
            </h2>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              검증 페이지에서 계산된 결과를 요약 표시합니다.
            </div>
          </div>
          <button style={closeButtonStyle} onClick={onClose}>
            닫기
          </button>
        </div>

        <div style={gridStyle} className="validation-grid">
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>
              영역(측정)
            </h3>
            <div style={kvStyle}>
              <KVRow k="측정 이름" v={measurementInfo?.name ?? "-"} />
              <KVRow k="포인트 개수" v={measurementInfo?.pointsCount ?? "-"} />
              <KVRow
                k="BBox 너비(X)"
                v={
                  measurementInfo?.bboxWidth != null
                    ? `${safeNumber(measurementInfo.bboxWidth, 3)} m`
                    : "-"
                }
              />
              <KVRow
                k="BBox 높이(Y)"
                v={
                  measurementInfo?.bboxHeight != null
                    ? `${safeNumber(measurementInfo.bboxHeight, 3)} m`
                    : "-"
                }
              />
              <KVRow
                k="둘레(추정)"
                v={
                  measurementInfo?.perimeter != null
                    ? `${safeNumber(measurementInfo.perimeter, 3)} m`
                    : "-"
                }
              />
              <KVRow k="면적(계산값)" v={measurementInfo?.area_m2 != null ? `${safeNumber(measurementInfo.area_m2, 2)} m²` : "-"} />
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>
              경로
            </h3>
            <div style={kvStyle}>
              <KVRow k="생성 여부" v={pathInfo?.hasPath ? "OK" : "아직 경로가 없습니다."} />
              <KVRow k="Feature 개수" v={pathInfo?.featureCount ?? "-"} />
              <KVRow
                k="총 길이(2D 합)"
                v={
                  pathInfo?.pathLength_m != null
                    ? `${safeNumber(pathInfo.pathLength_m, 3)} m`
                    : "-"
                }
              />
              <KVRow
                k="차량 너비"
                v={
                  pathInfo?.vehicleWidth_m != null
                    ? `${safeNumber(pathInfo.vehicleWidth_m, 2)} m`
                    : "-"
                }
              />
              <KVRow
                k="경로 면적"
                v={
                  pathInfo?.pathArea != null && pathInfo.pathArea > 0
                    ? `${safeNumber(pathInfo.pathArea, 2)} m² (길이 × 너비)`
                    : "-"
                }
              />
            </div>

            <h3 style={{ margin: "14px 0 8px", fontSize: 15, fontWeight: 700 }}>
              면적 비율
            </h3>
            <div style={kvStyle}>
              <KVRow
                k="전체 면적"
                v={
                  coverageInfo?.totalArea_m2 != null
                    ? `${safeNumber(coverageInfo.totalArea_m2, 2)} m²`
                    : "-"
                }
              />
              <KVRow
                k="경로 면적(중복 제거)"
                v={
                  coverageInfo?.uniqueCoverageArea_m2 != null
                    ? `${safeNumber(coverageInfo.uniqueCoverageArea_m2, 2)} m²`
                    : "-"
                }
              />
              <KVRow
                k="차지 비율"
                v={
                  coverageInfo?.coveragePct != null
                    ? `${Math.ceil(coverageInfo.coveragePct)} %`
                    : "-"
                }
                highlight
              />
            </div>

            <h3 style={{ margin: "14px 0 8px", fontSize: 15, fontWeight: 700 }}>
              평행도 평가 (빨간색 두둑)
            </h3>
            <div style={kvStyle}>
              <KVRow k="평가 스와스 수" v={parallelismInfo?.swathCount ?? "-"} />
              <KVRow
                k="평균 각도 차이"
                v={
                  parallelismInfo?.avgAngleDiff_deg != null
                    ? `${safeNumber(parallelismInfo.avgAngleDiff_deg, 3)}°`
                    : "-"
                }
              />
              <KVRow
                k="최대 각도 차이"
                v={
                  parallelismInfo?.maxAngleDiff_deg != null
                    ? `${safeNumber(parallelismInfo.maxAngleDiff_deg, 3)}°`
                    : "-"
                }
              />
              <KVRow
                k="평행도 평가"
                v={
                  parallelismInfo?.within2Deg != null
                    ? parallelismInfo.within2Deg
                      ? "✓ 2° 이내 (OK)"
                      : "✗ 2° 초과 (불합격)"
                    : "-"
                }
                highlight={parallelismInfo?.within2Deg === true}
                danger={parallelismInfo?.within2Deg === false}
              />
            </div>

            <h3 style={{ margin: "14px 0 8px", fontSize: 15, fontWeight: 700 }}>
              간격 표준편차 평가 (스와스 전체, 기준 간격=0m)
            </h3>
            <div style={kvStyle}>
              <KVRow k="평가 스와스 수" v={spacingInfo?.swathCount ?? "-"} />
              <KVRow
                k="평균 빈 공간 간격"
                v={
                  spacingInfo?.meanGap_m != null
                    ? `${safeNumber(spacingInfo.meanGap_m, 3)} m (중심선 간격 - 차량 폭, 이상적 0m)`
                    : "-"
                }
              />
              <KVRow
                k="표준편차"
                v={
                  spacingInfo?.stdDev_m != null
                    ? `${safeNumber(spacingInfo.stdDev_m, 3)} m (${safeNumber(
                        spacingInfo.stdDev_m * 100,
                        2
                      )} cm)`
                    : "-"
                }
              />
              <KVRow
                k="간격 평가"
                v={
                  spacingInfo?.within5cm != null
                    ? spacingInfo.within5cm
                      ? "✓ 5cm 이내 (OK)"
                      : "✗ 5cm 초과 (불합격)"
                    : "-"
                }
                highlight={spacingInfo?.within5cm === true}
                danger={spacingInfo?.within5cm === false}
              />
            </div>

            <h3 style={{ margin: "14px 0 8px", fontSize: 15, fontWeight: 700 }}>
              옵션
            </h3>
            <div style={kvStyle}>
              <KVRow k="경로 모드" v={options?.pathMode ?? "-"} />
              <KVRow k="방향" v={options?.direction ?? "-"} />
              <KVRow k="작업 모드" v={options?.workMode ?? "-"} />
              <KVRow
                k="간격(두둑)"
                v={options?.interval != null ? `${options.interval}` : "-"}
              />
              <KVRow
                k="마커 크기(두둑)"
                v={options?.size != null ? `${options.size}` : "-"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

