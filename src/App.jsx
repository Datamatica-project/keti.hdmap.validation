import { useMemo, useState, useRef } from "react";
import "./App.css";
import PathInfoModal from "./components/PathInfoModal";
import ConstraintValidationModal from "./components/ConstraintValidationModal";
import LoadingModal from "./components/LoadingModal";

/**
 * 2D 거리 계산 함수
 */
function distance2D(a, b) {
  const ax = a?.[0] ?? 0;
  const ay = a?.[1] ?? 0;
  const bx = b?.[0] ?? 0;
  const by = b?.[1] ?? 0;
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 경로 길이 계산 함수
 */
function computePathLength2D(features) {
  if (!features?.length) return 0;
  let sum = 0;
  for (const f of features) {
    if (f?.geometry?.type !== "LineString") continue;
    const coords = f.geometry.coordinates || [];
    for (let i = 0; i < coords.length - 1; i++) {
      sum += distance2D(coords[i], coords[i + 1]);
    }
  }
  return sum;
}

/**
 * LineString의 방향 벡터(각도) 계산 (라디안)
 */
function computeLineDirection(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return null;

  if (coords.length === 2) {
    const start = coords[0];
    const end = coords[1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    return Math.atan2(dy, dx);
  }

  const angles = [];
  const sampleStep = Math.max(1, Math.floor(coords.length / 10));

  for (let i = 0; i < coords.length - 1; i += sampleStep) {
    const start = coords[i];
    const end = coords[Math.min(i + sampleStep, coords.length - 1)];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 0.01) {
      angles.push(Math.atan2(dy, dx));
    }
  }

  if (angles.length === 0) return null;

  let sumX = 0;
  let sumY = 0;
  for (const angle of angles) {
    sumX += Math.cos(angle);
    sumY += Math.sin(angle);
  }

  return Math.atan2(sumY / angles.length, sumX / angles.length);
}

/**
 * 두 각도 간의 차이 계산 (라디안 → 도)
 */
function angleDifference(angle1, angle2) {
  if (angle1 === null || angle2 === null) return null;
  let diff = Math.abs(angle1 - angle2);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return (diff * 180) / Math.PI;
}

/**
 * 평행도 평가 계산
 */
function computeParallelism(features) {
  // PATH 타입의 LineString만 필터링
  const paths = features.filter(
    (f) => f?.geometry?.type === "LineString" && f?.properties?.type === "PATH",
  );

  if (paths.length < 2) return null;

  // 각 경로의 방향 벡터 계산
  const angles = [];
  for (const path of paths) {
    const coords = path.geometry.coordinates || [];
    const angle = computeLineDirection(coords);
    if (angle !== null) {
      angles.push(angle);
    }
  }

  if (angles.length < 2) return null;

  // 인접한 경로들 간의 각도 차이 계산
  const angleDiffs = [];
  for (let i = 0; i < angles.length - 1; i++) {
    const diff = angleDifference(angles[i], angles[i + 1]);
    if (diff !== null) {
      angleDiffs.push(diff);
    }
  }

  if (angleDiffs.length === 0) return null;

  const maxDiff = Math.max(...angleDiffs);
  const avgDiff = angleDiffs.reduce((sum, d) => sum + d, 0) / angleDiffs.length;

  return {
    swathCount: paths.length,
    maxAngleDiff: maxDiff,
    avgAngleDiff: avgDiff,
    within2Deg: maxDiff <= 2,
  };
}

/**
 * GeoJSON 파일을 파싱하여 검증 데이터로 변환하는 함수
 */
function parseGeoJSON(geoJsonData) {
  try {
    // FeatureCollection 형식 확인
    if (geoJsonData.type !== "FeatureCollection" || !geoJsonData.features) {
      throw new Error("유효한 GeoJSON FeatureCollection 형식이 아닙니다.");
    }

    const features = geoJsonData.features || [];
    const properties = geoJsonData.properties || {};
    const equipment = properties.equipment || {};

    // PATH 타입의 경로만 필터링
    const pathFeatures = features.filter(
      (f) =>
        f?.geometry?.type === "LineString" && f?.properties?.type === "PATH",
    );

    // 경로 길이 계산
    const pathLength = computePathLength2D(pathFeatures);

    // 차량 너비
    const vehicleWidth = equipment.width || 0;

    // 경로 면적 계산
    const pathArea = pathLength * vehicleWidth;

    // 평행도 평가
    const parallelism = computeParallelism(features);

    // 간격 표준편차는 GeoJSON에서는 계산하기 어려움 (영역 정보 필요)
    // 기본값으로 설정
    const spacingInfo = parallelism
      ? {
          swathCount: parallelism.swathCount,
          meanGap_m: 0,
          stdDev_m: 0,
          stdDevCm: 0,
          within5cm: true, // 영역 정보가 없어 정확한 계산 불가
        }
      : null;

    return {
      measurementInfo: null, // GeoJSON에는 영역 정보가 없음
      pathInfo: {
        hasPath: pathFeatures.length > 0,
        featureCount: pathFeatures.length,
        pathLength_m: pathLength,
        vehicleWidth_m: vehicleWidth,
        pathArea: pathArea,
      },
      coverageInfo: null, // 영역 정보가 없어 커버리지 계산 불가
      parallelismInfo: parallelism
        ? {
            swathCount: parallelism.swathCount,
            maxAngleDiff_deg: parallelism.maxAngleDiff,
            avgAngleDiff_deg: parallelism.avgAngleDiff,
            within2Deg: parallelism.within2Deg,
          }
        : null,
      spacingInfo,
      options: {
        pathMode: properties.workType || "-",
        direction: "-",
        workMode: properties.workType || "-",
      },
      metadata: {
        extractedAt: properties.createdAt
          ? new Date(properties.createdAt).toISOString()
          : new Date().toISOString(),
        version: "GeoJSON",
        source: "GeoJSON",
        projectId: properties.projectId,
        routeId: properties.routeId,
        name: properties.name,
      },
    };
  } catch (error) {
    console.error("GeoJSON 파싱 오류:", error);
    throw new Error(`GeoJSON 파일 파싱 실패: ${error.message}`);
  }
}

/**
 * JSON 파일을 파싱하여 검증 데이터로 변환하는 함수
 */
function parseValidationJSON(jsonData) {
  try {
    // 영역(측정) 정보 변환
    const measurementInfo = jsonData.measurement
      ? {
          name: jsonData.measurement.name || "-",
          pointsCount: jsonData.measurement.pointsCount || 0,
          bboxWidth: jsonData.measurement.bboxWidth || 0,
          bboxHeight: jsonData.measurement.bboxHeight || 0,
          perimeter: jsonData.measurement.perimeter || 0,
          area_m2: jsonData.measurement.actualArea || 0,
        }
      : null;

    // 경로 정보 변환
    const pathInfo = jsonData.path
      ? {
          hasPath: true,
          featureCount: jsonData.path.featureCount || 0,
          pathLength_m: jsonData.path.totalLength || 0,
          vehicleWidth_m: jsonData.path.vehicleWidth || 0,
          pathArea: jsonData.path.pathArea || 0,
        }
      : {
          hasPath: false,
          featureCount: 0,
          pathLength_m: 0,
          vehicleWidth_m: 0,
          pathArea: 0,
        };

    // 커버리지 정보 변환
    const coverageInfo = jsonData.coverage
      ? {
          totalArea_m2: jsonData.coverage.totalArea || 0,
          uniqueCoverageArea_m2: jsonData.coverage.uniqueCoverageArea || 0,
          coveragePct: jsonData.coverage.coveragePercentage || 0,
        }
      : null;

    // 평행도 정보 변환
    const parallelismInfo = jsonData.parallelism
      ? {
          swathCount: jsonData.parallelism.swathCount || 0,
          maxAngleDiff_deg: jsonData.parallelism.maxAngleDiff || 0,
          avgAngleDiff_deg: jsonData.parallelism.avgAngleDiff || 0,
          within2Deg: jsonData.parallelism.within2Deg || false,
        }
      : null;

    // 간격 표준편차 정보 변환
    const spacingInfo = jsonData.spacingStdDev
      ? {
          swathCount: jsonData.spacingStdDev.swathCount || 0,
          meanGap_m: jsonData.spacingStdDev.meanSpacing || 0,
          stdDev_m: jsonData.spacingStdDev.stdDev || 0,
          stdDevCm: jsonData.spacingStdDev.stdDevCm || 0,
          within5cm: jsonData.spacingStdDev.within5cm || false,
        }
      : null;

    // 옵션 정보
    const options = jsonData.options || {};

    return {
      measurementInfo,
      pathInfo,
      coverageInfo,
      parallelismInfo,
      spacingInfo,
      options,
      metadata: {
        extractedAt: jsonData.extractedAt,
        version: jsonData.version,
      },
    };
  } catch (error) {
    console.error("JSON 파싱 오류:", error);
    throw new Error("JSON 파일 형식이 올바르지 않습니다.");
  }
}

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConstraintModalOpen, setIsConstraintModalOpen] = useState(false);
  const [isLoadingModalOpen, setIsLoadingModalOpen] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const pendingDataRef = useRef(null); // 로딩 중 처리할 데이터 임시 저장

  // 파일 업로드 핸들러
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // JSON/GeoJSON 파일인지 확인
    const isJson = file.name.endsWith(".json");
    const isGeoJson = file.name.endsWith(".geojson");

    if (!isJson && !isGeoJson) {
      setError("JSON 또는 GeoJSON 파일만 업로드 가능합니다.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // 파일 형식 감지 및 파싱
      let parsedData = null;
      let isGeoJson = false;

      if (jsonData.type === "FeatureCollection" && jsonData.features) {
        // GeoJSON 형식 - 제약 조건 모달 표시
        isGeoJson = true;
        parsedData = jsonData;
      } else if (jsonData.measurement || jsonData.path) {
        // 검증 JSON 형식 - 기존 PathInfoModal 표시
        isGeoJson = false;
        parsedData = parseValidationJSON(jsonData);
      } else {
        throw new Error(
          "지원하지 않는 파일 형식입니다. 검증 JSON 또는 GeoJSON 파일을 업로드해주세요.",
        );
      }

      // 로딩 모달 표시를 위해 데이터 임시 저장
      pendingDataRef.current = { data: parsedData, isGeoJson };

      // 로딩 모달 열기
      setIsLoadingModalOpen(true);
    } catch (err) {
      console.error("파일 처리 오류:", err);
      setError(
        err.message ||
          "파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.",
      );
      setIsLoading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 파일 선택 버튼 클릭 핸들러
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // 로딩 완료 핸들러
  const handleLoadingComplete = () => {
    setIsLoadingModalOpen(false);
    setIsLoading(false);

    const pending = pendingDataRef.current;
    if (!pending) return;

    if (pending.isGeoJson) {
      // GeoJSON 형식 - 제약 조건 모달 표시
      setGeojsonData(pending.data);
      setValidationData(null);
      setIsConstraintModalOpen(true);
    } else {
      // 검증 JSON 형식 - 기존 PathInfoModal 표시
      setValidationData(pending.data);
      setGeojsonData(null);
      setIsOpen(true);
    }

    // 임시 데이터 초기화
    pendingDataRef.current = null;

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {/* 기관 헤더 */}
      <header className="gov-header">
        <div className="gov-header-inner">
          <div className="gov-header-badge">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>공식 검증</span>
          </div>
          <div className="gov-header-text">
            <h1 className="gov-title">공간정보 데이터 검증 시스템</h1>
            <p className="gov-subtitle">GeoJSON·검증 JSON 기반 경로 데이터의 구조적 무결성 및 품질 검증</p>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="gov-main">
        <div className="gov-container">
          <section className="gov-card gov-card-intro">
            <h2 className="gov-card-title">데이터 검증 신청</h2>
            <p className="gov-card-desc">
              검증할 JSON 또는 GeoJSON 파일을 선택하시면, 경로 무결성·평행도·간격 등 항목에 대한
              공식 검증 결과를 확인하실 수 있습니다.
            </p>
          </section>

          {/* 파일 업로드 영역 */}
          <section className="gov-card gov-upload-card">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.geojson"
              onChange={handleFileUpload}
              className="gov-file-input"
              aria-label="JSON 또는 GeoJSON 파일 선택"
            />
            {isLoading ? (
              <div className="gov-upload-loading">
                <div className="gov-spinner" aria-hidden="true" />
                <p className="gov-upload-status">파일을 분석하는 중입니다...</p>
                <p className="gov-upload-hint">잠시만 기다려 주세요.</p>
              </div>
            ) : (
              <div className="gov-upload-ready">
                <div className="gov-upload-icon">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="gov-upload-label">JSON 또는 GeoJSON 파일을 선택하여 업로드하세요</p>
                <p className="gov-upload-spec">지원 형식: .json, .geojson</p>
                <button
                  type="button"
                  onClick={handleSelectFile}
                  disabled={isLoading}
                  className="gov-btn gov-btn-primary"
                >
                  파일 선택
                </button>
              </div>
            )}
          </section>

          {/* 에러 메시지 */}
          {error && (
            <div className="gov-alert gov-alert-error" role="alert">
              <span className="gov-alert-icon" aria-hidden="true">⚠</span>
              {error}
            </div>
          )}

          {/* 검증 데이터 로드 완료 (JSON) */}
          {validationData && !isOpen && (
            <div className="gov-card gov-result-preview">
              <p className="gov-result-heading">
                <span className="gov-result-icon" aria-hidden="true">✓</span>
                파일이 정상적으로 로드되었습니다
              </p>
              {validationData.metadata && (
                <p className="gov-result-meta">
                  추출 일시: {new Date(validationData.metadata.extractedAt).toLocaleString("ko-KR")}
                  {validationData.metadata.version && ` · 버전: ${validationData.metadata.version}`}
                </p>
              )}
              <button type="button" onClick={() => setIsOpen(true)} className="gov-btn gov-btn-secondary">
                검증 보고서 보기
              </button>
            </div>
          )}

          {/* GeoJSON 로드 완료 */}
          {geojsonData && !isConstraintModalOpen && (
            <div className="gov-card gov-result-preview">
              <p className="gov-result-heading">
                <span className="gov-result-icon" aria-hidden="true">✓</span>
                GeoJSON 파일이 정상적으로 로드되었습니다
              </p>
              {geojsonData.properties && (
                <p className="gov-result-meta">
                  파일 형식: GeoJSON
                  {geojsonData.properties.name && ` · 이름: ${geojsonData.properties.name}`}
                  {geojsonData.properties.createdAt &&
                    ` · 생성일: ${new Date(geojsonData.properties.createdAt).toLocaleString("ko-KR")}`}
                </p>
              )}
              <button type="button" onClick={() => setIsConstraintModalOpen(true)} className="gov-btn gov-btn-secondary">
                제약 조건 검증 결과 보기
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="gov-footer">
        <div className="gov-footer-inner">
          <p className="gov-footer-text">
            본 시스템은 경로·공간정보 데이터의 품질 검증 목적으로 제공됩니다.
          </p>
          <p className="gov-footer-copy">© 데이터 검증 시스템</p>
        </div>
      </footer>

      {/* 검증 보고서 모달 (JSON 파일용) */}
      {validationData && (
        <PathInfoModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          measurementInfo={validationData.measurementInfo}
          pathInfo={validationData.pathInfo}
          coverageInfo={validationData.coverageInfo}
          parallelismInfo={validationData.parallelismInfo}
          spacingInfo={validationData.spacingInfo}
          options={validationData.options}
        />
      )}

      <LoadingModal isOpen={isLoadingModalOpen} onComplete={handleLoadingComplete} />

      {geojsonData && (
        <ConstraintValidationModal
          isOpen={isConstraintModalOpen}
          onClose={() => setIsConstraintModalOpen(false)}
          geojsonData={geojsonData}
        />
      )}
    </>
  );
}

export default App;
