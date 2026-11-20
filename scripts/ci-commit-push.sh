#!/usr/bin/env bash
# 배치(GitHub Actions)가 만든 데이터 파일을 커밋해 main 에 올리는 공용 스크립트 (2026-11-20 신설)
#
#   bash scripts/ci-commit-push.sh "커밋 메시지" <경로> [<경로> ...]
#
# 왜 따로 뺐나
#   - 예약 실행이 몇 시간씩 밀려 여러 배치가 같은 시각에 겹쳐 돈다. 한쪽이 먼저 올리면 다른 쪽은
#     push 거절(non-fast-forward)이나 같은 데이터 파일의 내용 충돌로 실패했다(미국 아침 배치가 그렇게 실패).
#   - 워크플로마다 조금씩 다른 처리(pull --rebase 만 / -X theirs / 재시도 없음)를 하나로 맞춘다.
#
# 하는 일
#   1) 넘겨받은 경로만 스테이징(-A: 지워진 파일 포함). 없는 경로·.gitignore 대상은 경고만 하고 넘어간다
#      (목록에 무시 대상 파일이 하나 끼어 3주간 배치가 통째로 실패한 적이 있음, 2026-10-06).
#   2) 바뀐 게 없으면 그대로 끝(성공).
#   3) 커밋 → 원격 최신을 받아 그 위에 다시 얹고(pull --rebase -X theirs: 같은 데이터 파일을 다른 배치가
#      먼저 고쳤으면 방금 만든 우리 값으로 자동 해결) → push. push 가 거절되면 다시 받아 최대 5번 시도.
#   4) rebase 자체가 실패하면(자동 해결이 안 되는 충돌·통신 오류) 원격 최신으로 맞춘 뒤
#      "이번 커밋이 바꾼 파일만" 다시 올려 커밋한다. 그 사이 다른 사람이 올린 다른 파일(앱 코드 등)은 건드리지 않는다.
#      (예전 방식 reset --soft 는 작업 시작 시점의 트리 전체를 다시 커밋해, 그 사이 올라온 다른 파일을 되돌릴 수 있었다)
#
# 환경 변수(시험용): CI_PUSH_REMOTE(기본 origin) · CI_PUSH_BRANCH(기본 main) · CI_PUSH_SLEEP(재시도 간격 초, 기본 15)

if [ "$#" -lt 2 ]; then
  echo "사용: bash scripts/ci-commit-push.sh \"커밋 메시지\" <경로> [<경로> ...]"
  exit 2
fi
MSG="$1"
shift
REMOTE="${CI_PUSH_REMOTE:-origin}"
BRANCH="${CI_PUSH_BRANCH:-main}"
WAIT="${CI_PUSH_SLEEP:-15}"

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

for p in "$@"; do
  if ! err="$(git add -A -- "$p" 2>&1)"; then
    echo "::warning::git add 건너뜀($p): $err"
  fi
done

if git diff --cached --quiet; then
  echo "변경된 데이터 없음"
  exit 0
fi

git commit -q -m "$MSG" || { echo "::error::git commit 실패"; exit 1; }
BASE="$(git rev-parse HEAD~1)"
mapfile -t CHANGED < <(git -c core.quotepath=false diff --name-only --diff-filter=ACMRT "$BASE" HEAD)
mapfile -t DELETED < <(git -c core.quotepath=false diff --name-only --diff-filter=D "$BASE" HEAD)
echo "이번 커밋: 바뀐 파일 ${#CHANGED[@]}개, 지워진 파일 ${#DELETED[@]}개"

# 이번 커밋이 바꾼 파일을 따로 보관(4번 '다시 얹기'용)
KEEP="$(mktemp -d)"
for f in "${CHANGED[@]}"; do
  mkdir -p "$KEEP/$(dirname "$f")"
  cp -p "$f" "$KEEP/$f"
done

# 커밋 뒤 작업 폴더에 남은 변경(목록 밖 파일·임시 파일)이 있으면 rebase 가 막히므로 치워 둔다
git status --short | head -n 20
git stash --include-untracked -q || true

restack() {
  git rebase --abort >/dev/null 2>&1 || true
  git fetch "$REMOTE" "$BRANCH" || return 1
  git reset -q --hard FETCH_HEAD || return 1
  for f in "${CHANGED[@]}"; do
    mkdir -p "$(dirname "$f")"
    cp -p "$KEEP/$f" "$f"
    git add -- "$f"
  done
  for f in "${DELETED[@]}"; do
    git rm -q --ignore-unmatch -- "$f"
  done
  if git diff --cached --quiet; then
    echo "원격과 내용이 같아 새로 올릴 커밋이 없음"
  else
    git commit -q -m "$MSG" || return 1
  fi
  return 0
}

pushed=0
for attempt in 1 2 3 4 5; do
  if ! git pull --rebase -X theirs "$REMOTE" "$BRANCH"; then
    echo "rebase 실패($attempt) — 원격 최신 위에 이번 배치가 바꾼 파일만 다시 얹는다"
    if ! restack; then
      echo "원격을 받지 못함($attempt) — 잠시 뒤 다시 시도"
      sleep $((attempt * WAIT))
      continue
    fi
  fi
  if git push "$REMOTE" "HEAD:$BRANCH"; then
    pushed=1
    break
  fi
  echo "push 실패($attempt) — 다른 배치가 먼저 올린 것으로 보임. 다시 받아 올린다"
  sleep $((attempt * WAIT))
done

rm -rf "$KEEP"
if [ "$pushed" != "1" ]; then
  echo "::error::데이터 커밋을 올리지 못했습니다(5번 시도)."
  exit 1
fi
echo "올림 완료: $MSG"
