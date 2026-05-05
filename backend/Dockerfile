FROM maven:3.9.5-eclipse-temurin-17

# Skip tesseract install due to ubuntu repo network failures; will use mock fallback for demo
# RUN apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-eng

WORKDIR /app
COPY pom.xml ./
# For the sake of speeding up the build, we just copy everything
COPY src ./src

# Create dummy docs dir
RUN mkdir -p dummy_docs uploads

# Note: In a real prod scenario we would use mvnw dependency:go-offline first
RUN mvn clean package -DskipTests

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "target/claim-processing-0.0.1-SNAPSHOT.jar"]
