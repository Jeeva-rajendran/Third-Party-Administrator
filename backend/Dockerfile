FROM maven:3.9.5-eclipse-temurin-17

# Install Tesseract OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pom.xml ./
COPY src ./src

# Create required directories
RUN mkdir -p dummy_docs uploads

# Build the application
RUN mvn clean package -DskipTests

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "target/claim-processing-0.0.1-SNAPSHOT.jar"]
