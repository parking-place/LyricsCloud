FROM golang:1.26.8-bookworm@sha256:9fdc884aacc3bec89b20ffc69f4bb369c78210e3e4f600387b5128b12c199f81 AS age

RUN CGO_ENABLED=0 go install filippo.io/age/cmd/age@v1.3.2 filippo.io/age/cmd/age-keygen@v1.3.2

FROM postgres:18-bookworm@sha256:a10c981235b4f635e65df0cfb66a5598064628128505dbc6a3ed4ca303717521

RUN rm -f /usr/local/bin/gosu
COPY --from=age --chmod=0555 /go/bin/age /go/bin/age-keygen /usr/local/bin/
COPY --chmod=0555 infra/backup/backup.sh /usr/local/bin/lyricscloud-backup
COPY --chmod=0555 infra/backup/restore.sh /usr/local/bin/lyricscloud-restore
COPY --chmod=0555 infra/backup/check-rpo.sh /usr/local/bin/lyricscloud-check-rpo

USER postgres
ENTRYPOINT ["/usr/local/bin/lyricscloud-backup"]
