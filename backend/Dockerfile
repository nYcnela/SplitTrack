FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --create-home --uid 1000 appuser \
    && mkdir -p /app/uploads \
    && chown -R appuser:appuser /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-Xms128m -Xmx384m" \
    APP_UPLOADS_DIR="/app/uploads" \
    TZ="Europe/Warsaw"
USER appuser
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
