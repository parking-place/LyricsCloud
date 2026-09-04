# Backup boundary

ADR-0008에 따라 운영 단계에서 `pg_dump --format=custom` 출력을 평문 파일 없이 age recipient로 암호화하고 DB 호스트와 분리된 저장소에 30일 보존합니다.

0.0.0에서는 `backup_data` volume 경계만 예약합니다. backup job, key, 실제 저장소와 월별 복원 훈련은 0.9.1에서 구현합니다. DB volume은 backup이 아니며 소스 bind mount에 backup을 저장하지 않습니다.
