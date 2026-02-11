# 물리적 제약 조건 검증 모달 – 데이터 구조 비교

모달에서 **필요로 하는 데이터 구조**와 **실제 저장되는 GeoJSON 구조**를 비교하고, 현재 저장 구조에 없는 항목을 정리한 문서입니다.

---

## 1. 모달에서 필요한 데이터 구조

`ConstraintValidationModal`은 **GeoJSON FeatureCollection** 한 개를 입력으로 받으며, 아래 구조를 기대합니다.

### 1.1 루트

| 경로 | 타입 | 필수 | 비고 |
|------|------|------|------|
| `type` | `"FeatureCollection"` | ✓ | |
| `properties` | object | ✓ | 없으면 제약 정보 추출 불가 |
| `features` | array | ✓ | 최소한 빈 배열 |

### 1.2 `properties.equipment` (기계 스펙)

| 필드 | 타입 | 단위 | 모달 표시 항목 | 비고 |
|------|------|------|----------------|------|
| `name` | string | - | 기계 이름 | 없으면 "-" |
| `width` | number | m | 차량 폭 | 제약·헤드랜드 검증에도 사용 |
| `wheelbase` | number | m | 축간거리 | |
| `steerDeg` | number | ° | 조향각 | |
| `turningRadius` | number | m | 회전 반경 | `constraints.turningRadius` 폴백 |
| `vehicleLength` | number | m | 차체 길이 | |

### 1.3 `properties.constraints` (제약 조건)

| 필드 | 타입 | 단위 | 모달 표시 항목 | 비고 |
|------|------|------|----------------|------|
| `turningRadius` | number | m | 회전 반경 | `equipment.turningRadius` 폴백 |
| `safetyMargin` | number | m | 안전 마진 | |
| `vehicleWidth` | number | m | 차량 폭 | 헤드랜드 폭 검증에 사용, `equipment.width` 폴백 |

### 1.4 `features[]` (피처 배열)

모달은 **`feature.properties.type`** 과 **`feature.geometry.type`** 만 사용합니다.

| `properties.type` | `geometry.type` | 용도 |
|-------------------|-----------------|------|
| `"WORK_AREA"` | `"Polygon"` | 작업 영역. 헤드랜드 폭 계산 시 “전체 영역 너비”로 사용 |
| `"HEADLAND"` | `"Polygon"` | 헤드랜드 영역. 헤드랜드 폭 계산 및 검증에 사용 |

- **헤드랜드 폭 계산**: `(WORK_AREA 폴리곤 너비 - HEADLAND 폴리곤 너비) / 2`
- **헤드랜드 폭 검증**: 위에서 계산한 헤드랜드 폭 ≥ 차량 폭 여부
- **데이터 가용성**: “작업 영역 폴리곤” = WORK_AREA Polygon 존재 여부, “헤드랜드 폴리곤” = HEADLAND Polygon 존재 여부

---

## 2. 실제 저장되는 데이터 구조 (예: area (2).geojson)

### 2.1 루트

- `type`: `"FeatureCollection"` ✓
- `properties`: 존재 ✓
- `features`: 존재 (PATH LineString 다수) ✓

### 2.2 `properties` 내용

- `projectId`, `routeId`, `name`, `workType`, `description`, `createdAt` 등 메타데이터 ✓

### 2.3 `properties.equipment`

| 필드 | 저장 여부 | 비고 |
|------|-----------|------|
| `id` | ✓ | 저장됨 (모달에서는 미사용) |
| `name` | ✓ | |
| `width` | ✓ | |
| `wheelbase` | ✓ | |
| `steerDeg` | ✓ | |
| `turningRadius` | ✓ | |
| `vehicleLength` | ✓ | |

→ **모달에서 쓰는 equipment 필드는 모두 저장되고 있음.**

### 2.4 `properties.constraints`

| 필드 | 저장 여부 | 비고 |
|------|-----------|------|
| `turningRadius` | ✓ | |
| `safetyMargin` | ✓ | |
| `vehicleWidth` | ✓ | |

→ **모달에서 쓰는 constraints 필드는 모두 저장되고 있음.**

### 2.5 `features[]`

| 피처 종류 | 저장 여부 | 비고 |
|-----------|-----------|------|
| `type: "PATH"`, `LineString` | ✓ | 경로 데이터만 다수 존재 |
| `type: "WORK_AREA"`, `Polygon` | ✗ | **저장 안 됨** |
| `type: "HEADLAND"`, `Polygon` | ✗ | **저장 안 됨** |

---

## 3. 비교 요약 – 현재 데이터 구조에 없는 항목

**`properties` / `equipment` / `constraints`**  
→ 모달에 필요한 항목은 **모두 현재 저장 구조에 있음.**

**`features`**  
→ 다음 두 종류의 피처가 **저장 구조에는 없음.**

| 구분 | 필요한 데이터 | 현재 저장 여부 | 영향 |
|------|----------------|----------------|------|
| 작업 영역 | `features[]` 중 `properties.type === "WORK_AREA"` 이고 `geometry.type === "Polygon"` 인 피처 1개 이상 | **없음** | 헤드랜드 폭 계산 불가, “작업 영역 폴리곤 없음” 표시 |
| 헤드랜드 | `features[]` 중 `properties.type === "HEADLAND"` 이고 `geometry.type === "Polygon"` 인 피처 1개 이상 | **없음** | 헤드랜드 폭 계산·검증 불가, “헤드랜드 폴리곤 없음” 표시 |

### 3.1 추가 시 기대 형식 (참고)

```json
{
  "type": "Feature",
  "properties": {
    "type": "WORK_AREA"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[x,y], [x,y], ...]]
  }
}
```

```json
{
  "type": "Feature",
  "properties": {
    "type": "HEADLAND"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[x,y], [x,y], ...]]
  }
}
```

- 좌표계는 기존 PATH와 동일한 좌표계 사용 권장 (예: UTM 등).
- WORK_AREA는 전체 작업 영역 외곽, HEADLAND는 그 안쪽 헤드랜드 영역을 닫힌 링으로 표현하면 됨.

---

## 4. 정리

| 구분 | 상태 |
|------|------|
| **properties / equipment / constraints** | 필요 데이터 모두 저장됨 ✓ |
| **features – WORK_AREA Polygon** | **저장 구조에 없음** → 추출/저장 로직 추가 필요 |
| **features – HEADLAND Polygon** | **저장 구조에 없음** → 추출/저장 로직 추가 필요 |

저장 측(HdMap 등)에서 GeoJSON 내보낼 때 **WORK_AREA**, **HEADLAND** 폴리곤을 `features` 배열에 포함시키면, 모달에서 헤드랜드 폭 계산·검증과 데이터 가용성까지 모두 표시할 수 있습니다.
