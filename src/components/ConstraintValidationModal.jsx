import React from "react";
import "../App.css";

/**
 * GeoJSON 파일의 물리적 제약 조건 검증 모달
 * - 회전 반경
 * - 헤드랜드 너비 및 안전 마진
 * - 차량 폭과 기계 스펙
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
  const color = danger
    ? "#ff6666"
    : highlight
      ? "#00ff99"
      : "rgba(255,255,255,0.95)";
  return (
    <>
      <div style={{ color: "rgba(255,255,255,0.7)" }}>{k}</div>
      <div
        style={{ color, fontWeight: highlight || danger ? "bold" : "normal" }}
      >
        {v}
      </div>
    </>
  );
}

function StatusBadge({ status, children }) {
  const bgColor =
    status === "valid"
      ? "rgba(0, 255, 153, 0.2)"
      : status === "invalid"
        ? "rgba(255, 102, 102, 0.2)"
        : "rgba(255, 255, 255, 0.1)";
  const textColor =
    status === "valid"
      ? "#00ff99"
      : status === "invalid"
        ? "#ff6666"
        : "rgba(255, 255, 255, 0.7)";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        background: bgColor,
        color: textColor,
      }}
    >
      {children}
    </span>
  );
}

/**
 * GeoJSON에서 제약 조건 정보 추출
 */
function extractConstraints(geojsonData) {
  if (!geojsonData || !geojsonData.properties) {
    return null;
  }

  const props = geojsonData.properties;
  const equipment = props.equipment || {};
  const constraints = props.constraints || {};

  // 기계 스펙 정보
  const machineSpecs = {
    name: equipment.name || "-",
    width: equipment.width || constraints.vehicleWidth || null,
    wheelbase: equipment.wheelbase || null,
    steerDeg: equipment.steerDeg || null,
    turningRadius: equipment.turningRadius || constraints.turningRadius || null,
    vehicleLength: equipment.vehicleLength || null,
  };

  // 제약 조건 정보
  const turningRadius =
    constraints.turningRadius ?? equipment.turningRadius ?? null;
  const safetyMargin = constraints.safetyMargin ?? null;
  const constraintInfo = {
    turningRadius,
    safetyMargin,
    vehicleWidth: constraints.vehicleWidth || equipment.width || null,
  };

  // 헤드랜드 폭: 회전 반경 + 안전 마진 (값이 있으면 헤드랜드 폴리곤 "있음" 처리)
  let headlandWidth = null;
  if (turningRadius != null && safetyMargin != null) {
    headlandWidth = turningRadius + safetyMargin;
  }

  // 작업 영역 폴리곤: waypointDetails에 좌표가 존재하면 "있음"
  console.log("geojsonData", geojsonData);
  const waypointDetails = geojsonData.features[0].geometry.coordinates;
  const hasWorkArea = (() => {
    if (!waypointDetails) return false;
    if (Array.isArray(waypointDetails) && waypointDetails.length > 0) {
      const first = waypointDetails[0];
      if (Array.isArray(first) && first.length >= 2) return true;
      if (
        first &&
        typeof first === "object" &&
        ("x" in first || "lat" in first)
      )
        return true;
      return true;
    }
    if (waypointDetails?.coordinates?.length > 0) return true;
    return false;
  })();

  // 헤드랜드 폴리곤: 헤드랜드 폭 값이 존재하면 "있음"
  const hasHeadland = headlandWidth != null;

  return {
    machineSpecs,
    constraintInfo,
    headlandWidth,
    hasWorkArea,
    hasHeadland,
  };
}

export default function ConstraintValidationModal({
  isOpen,
  onClose,
  geojsonData,
}) {
  if (!isOpen) return null;

  const constraints = geojsonData ? extractConstraints(geojsonData) : null;

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
              물리적 제약 조건 검증
            </h2>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              GeoJSON 파일의 물리적 제약 조건을 확인합니다.
            </div>
          </div>
          <button style={closeButtonStyle} onClick={onClose}>
            닫기
          </button>
        </div>

        {constraints ? (
          <div style={gridStyle}>
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>
                기계 스펙
              </h3>
              <div style={kvStyle}>
                <KVRow k="기계 이름" v={constraints.machineSpecs.name} />
                <KVRow
                  k="차량 폭"
                  v={
                    constraints.machineSpecs.width != null
                      ? `${safeNumber(constraints.machineSpecs.width, 2)} m`
                      : "-"
                  }
                />
                <KVRow
                  k="축간거리"
                  v={
                    constraints.machineSpecs.wheelbase != null
                      ? `${safeNumber(constraints.machineSpecs.wheelbase, 2)} m`
                      : "-"
                  }
                />
                <KVRow
                  k="조향각"
                  v={
                    constraints.machineSpecs.steerDeg != null
                      ? `${safeNumber(constraints.machineSpecs.steerDeg, 1)}°`
                      : "-"
                  }
                />
                <KVRow
                  k="차체 길이"
                  v={
                    constraints.machineSpecs.vehicleLength != null
                      ? `${safeNumber(constraints.machineSpecs.vehicleLength, 2)} m`
                      : "-"
                  }
                />
                <KVRow
                  k="회전 반경"
                  v={
                    constraints.machineSpecs.turningRadius != null
                      ? `${safeNumber(constraints.machineSpecs.turningRadius, 2)} m`
                      : "-"
                  }
                />
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>
                제약 조건
              </h3>
              <div style={kvStyle}>
                <KVRow
                  k="회전 반경"
                  v={
                    constraints.constraintInfo.turningRadius != null
                      ? `${safeNumber(constraints.constraintInfo.turningRadius, 2)} m`
                      : "-"
                  }
                />
                <KVRow
                  k="안전 마진"
                  v={
                    constraints.constraintInfo.safetyMargin != null
                      ? `${safeNumber(constraints.constraintInfo.safetyMargin, 2)} m`
                      : "-"
                  }
                />
                <KVRow
                  k="차량 폭"
                  v={
                    constraints.constraintInfo.vehicleWidth != null
                      ? `${safeNumber(constraints.constraintInfo.vehicleWidth, 2)} m`
                      : "-"
                  }
                />
                <KVRow
                  k="헤드랜드 폭"
                  v={
                    constraints.headlandWidth != null
                      ? `${safeNumber(constraints.headlandWidth, 3)} m`
                      : "-"
                  }
                />
              </div>

              <h3
                style={{ margin: "14px 0 8px", fontSize: 15, fontWeight: 700 }}
              >
                데이터 가용성
              </h3>
              <div style={kvStyle}>
                <KVRow
                  k="작업 영역 폴리곤"
                  v={
                    <StatusBadge
                      status={constraints.hasWorkArea ? "valid" : "invalid"}
                    >
                      {constraints.hasWorkArea ? "✓ 있음" : "✗ 없음"}
                    </StatusBadge>
                  }
                />
                <KVRow
                  k="헤드랜드 폴리곤"
                  v={
                    <StatusBadge
                      status={constraints.hasHeadland ? "valid" : "invalid"}
                    >
                      {constraints.hasHeadland ? "✓ 있음" : "✗ 없음"}
                    </StatusBadge>
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            제약 조건 정보를 추출할 수 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
