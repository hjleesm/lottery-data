# lottery-data

`로또 번호 생성기` Flutter 앱이 사용하는 동행복권 회차 데이터 저장소입니다.

`latest.json` 파일이 곧 데이터 그 자체이며, GitHub Pages를 통해 정적으로
서비스됩니다.

```
https://<username>.github.io/lottery-data/latest.json
```

## 자동 갱신

`.github/workflows/update.yml` 워크플로우가 매주 토요일 22:00 KST에 실행되어
동행복권 공식 API를 시도하고, 새 회차를 발견하면 `latest.json`에 commit합니다.

동행복권이 외부 API를 차단한 경우 자동 갱신이 조용히 실패하므로, 그때는
**수동 갱신**을 사용합니다.

## 수동 갱신 (회차 1개 추가)

1. 동행복권 공식 앱(복똑방) 또는 [공식 웹사이트](https://dhlottery.co.kr/)에서
   추가하려는 회차의 결과를 확인합니다.
2. GitHub 웹사이트에서 이 repo의 **Actions** 탭으로 이동합니다.
3. 좌측 워크플로우 목록에서 **Update Lotto Data**를 선택합니다.
4. 우측 상단 **Run workflow** 버튼을 누르고 다음 4개 입력란을 채웁니다:

   | 입력 | 예시 | 설명 |
   |---|---|---|
   | round | `1209` | 회차 번호 |
   | date | `2026-05-02` | 추첨일 (YYYY-MM-DD) |
   | numbers | `3,12,18,23,31,42` | 당첨 번호 6개 (쉼표 구분, 1-45) |
   | bonus | `7` | 보너스 번호 (1-45, 본 번호와 중복 불가) |

5. **Run workflow** 클릭. 1-2분 후 자동 commit + GitHub Pages 재배포가 끝납니다.

## 데이터 형식

```json
{
  "lastUpdated": "2026-05-02T13:01:00.000Z",
  "rounds": [
    { "round": 1208, "date": "2026-04-25", "numbers": [3, 12, 18, 23, 31, 42], "bonus": 7 },
    ...
  ]
}
```

`rounds`는 항상 회차 번호 내림차순으로 정렬됩니다.

## 초기 데이터 생성

이 저장소를 처음 부트스트랩할 때 `latest.json`은 메인 앱의 내장 데이터에서
생성됩니다. 메인 앱 repo에서 다음을 실행:

```sh
dart run tool/build_initial_data.dart
```

생성된 `tool/lottery-data/latest.json`을 이 repo로 복사 후 commit.

## 로컬 테스트

```sh
node scripts/update.js                       # auto 모드 (API 시도)
MANUAL_ROUND=1209 \
MANUAL_DATE=2026-05-02 \
MANUAL_NUMBERS=3,12,18,23,31,42 \
MANUAL_BONUS=7 \
node scripts/update.js                       # 수동 모드
```
