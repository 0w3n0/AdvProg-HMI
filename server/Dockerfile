# Étape 1 : compilation + tests + jar autonome
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src src
RUN mvn -q package

# Étape 2 : image d'exécution légère (Java seul, sans Maven)
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/server.jar server.jar
# Render fournit la variable PORT ; le serveur la lit au démarrage
CMD ["java", "-jar", "server.jar"]
