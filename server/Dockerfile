FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src src
RUN mvn -q package

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/server.jar server.jar
CMD ["java", "-jar", "server.jar"]
