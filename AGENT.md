# 데이터 변경 후 push 순서

1. `src/data.js` 수정
2. `docs/assets/index-DlNhHG70.js` 동일하게 수정
3. `python update-sw.py` — SW 캐시 버전 갱신
4. `git add . && git push`
