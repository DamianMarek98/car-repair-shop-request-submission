plugins {
    id("java")
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

private val awsSdkVersion: String = "2.31.26"
private val awsJavaLambdaCoreVersion: String = "1.2.3"
private val awsLambdaJavaEventsVersion: String = "3.15.0"

group = "car.repair.shop"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.amazonaws:aws-lambda-java-core:$awsJavaLambdaCoreVersion")
    implementation("software.amazon.awssdk:sns:$awsSdkVersion")
    implementation("com.amazonaws:aws-lambda-java-events:$awsLambdaJavaEventsVersion")

    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("org.mockito:mockito-junit-jupiter:5.17.0")
}

tasks {
    test {
        useJUnitPlatform()
    }
}

