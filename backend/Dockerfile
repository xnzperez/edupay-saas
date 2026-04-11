# ==========================================
# Etapa 1: Construcción (Builder)
# ==========================================
# Actualizamos a la versión 1.25 para que coincida con tu go.mod
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Usamos la ruta correcta de tu main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o edupay-backend ./cmd/api/main.go

# ==========================================
# Etapa 2: Producción (Runner)
# ==========================================
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/edupay-backend .

EXPOSE 8080

CMD ["./edupay-backend"]