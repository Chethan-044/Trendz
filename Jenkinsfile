pipeline {
    agent any

    environment {
        // ── AWS Configuration ─────────────────────────────────
        AWS_ACCOUNT_ID  = '133375667688'
        AWS_REGION      = 'us-east-1'
        ECR_REGISTRY    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

        // ── ECR Repository Names ──────────────────────────────
        BACKEND_REPO    = 'trendz-backend'
        FRONTEND_REPO   = 'trendz-frontend'
        ADMIN_REPO      = 'trendz-admin'

        // ── Git Configuration ─────────────────────────────────
        GIT_REPO_URL    = 'https://github.com/Chethan-044/Trendz.git'
        GIT_BRANCH      = 'main'

        // ── SonarQube ─────────────────────────────────────────
        SCANNER_HOME    = tool 'SonarScanner'             // Jenkins tool name for SonarQube Scanner
    }

    stages {

        // ────────────────────────────────────────────────────────
        // Stage 1: Clean Workspace
        // ────────────────────────────────────────────────────────
        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 2: Git Checkout
        // ────────────────────────────────────────────────────────
        stage('Git Checkout') {
            steps {
                git branch: "${GIT_BRANCH}",
                    url: "${GIT_REPO_URL}",
                    credentialsId: 'github-token'
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 3: SonarQube Code Analysis
        // ────────────────────────────────────────────────────────
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {           // 'SonarQube' = server name configured in Jenkins
                    sh """
                        ${SCANNER_HOME}/bin/sonar-scanner \
                            -Dsonar.projectKey=trendz-full-stack \
                            -Dsonar.projectName='Trendz Full Stack' \
                            -Dsonar.sources=backend/,frontend/src/,admin/src/ \
                            -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/*.test.js,**/*.spec.js \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    """
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 4: SonarQube Quality Gate Check
        // ────────────────────────────────────────────────────────
        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 5: Build Docker Images (Parallel)
        // ────────────────────────────────────────────────────────
        stage('Build Docker Images') {
            parallel {
                stage('Build Backend') {
                    steps {
                        dir('backend') {
                            sh "docker build -t ${BACKEND_REPO}:${BUILD_NUMBER} -t ${BACKEND_REPO}:latest ."
                        }
                    }
                }
                stage('Build Frontend') {
                    steps {
                        dir('frontend') {
                            sh "docker build -t ${FRONTEND_REPO}:${BUILD_NUMBER} -t ${FRONTEND_REPO}:latest ."
                        }
                    }
                }
                stage('Build Admin') {
                    steps {
                        dir('admin') {
                            sh "docker build -t ${ADMIN_REPO}:${BUILD_NUMBER} -t ${ADMIN_REPO}:latest ."
                        }
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 6: Trivy Security Scan (Parallel)
        // ────────────────────────────────────────────────────────
        stage('Trivy Security Scan') {
            parallel {
                stage('Scan Backend') {
                    steps {
                        sh """
                            trivy image \
                                --severity HIGH,CRITICAL \
                                --exit-code 0 \
                                --no-progress \
                                --format table \
                                ${BACKEND_REPO}:${BUILD_NUMBER} | tee backend-trivy-report.txt
                        """
                    }
                }
                stage('Scan Frontend') {
                    steps {
                        sh """
                            trivy image \
                                --severity HIGH,CRITICAL \
                                --exit-code 0 \
                                --no-progress \
                                --format table \
                                ${FRONTEND_REPO}:${BUILD_NUMBER} | tee frontend-trivy-report.txt
                        """
                    }
                }
                stage('Scan Admin') {
                    steps {
                        sh """
                            trivy image \
                                --severity HIGH,CRITICAL \
                                --exit-code 0 \
                                --no-progress \
                                --format table \
                                ${ADMIN_REPO}:${BUILD_NUMBER} | tee admin-trivy-report.txt
                        """
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 7: Push Docker Images to AWS ECR
        // ────────────────────────────────────────────────────────
        stage('Push to ECR') {
            steps {
                withAWS(credentials: 'aws-credentials', region: "${AWS_REGION}") {
                    sh """
                        # Login to ECR
                        aws ecr get-login-password --region ${AWS_REGION} | \
                            docker login --username AWS --password-stdin ${ECR_REGISTRY}

                        # ── Push Backend ──
                        docker tag ${BACKEND_REPO}:${BUILD_NUMBER}  ${ECR_REGISTRY}/${BACKEND_REPO}:${BUILD_NUMBER}
                        docker tag ${BACKEND_REPO}:latest            ${ECR_REGISTRY}/${BACKEND_REPO}:latest
                        docker push ${ECR_REGISTRY}/${BACKEND_REPO}:${BUILD_NUMBER}
                        docker push ${ECR_REGISTRY}/${BACKEND_REPO}:latest

                        # ── Push Frontend ──
                        docker tag ${FRONTEND_REPO}:${BUILD_NUMBER} ${ECR_REGISTRY}/${FRONTEND_REPO}:${BUILD_NUMBER}
                        docker tag ${FRONTEND_REPO}:latest           ${ECR_REGISTRY}/${FRONTEND_REPO}:latest
                        docker push ${ECR_REGISTRY}/${FRONTEND_REPO}:${BUILD_NUMBER}
                        docker push ${ECR_REGISTRY}/${FRONTEND_REPO}:latest

                        # ── Push Admin ──
                        docker tag ${ADMIN_REPO}:${BUILD_NUMBER}    ${ECR_REGISTRY}/${ADMIN_REPO}:${BUILD_NUMBER}
                        docker tag ${ADMIN_REPO}:latest              ${ECR_REGISTRY}/${ADMIN_REPO}:latest
                        docker push ${ECR_REGISTRY}/${ADMIN_REPO}:${BUILD_NUMBER}
                        docker push ${ECR_REGISTRY}/${ADMIN_REPO}:latest
                    """
                }
            }
        }

        // ────────────────────────────────────────────────────────
        // Stage 8: Update K8s Manifests & Push (GitOps trigger)
        // ────────────────────────────────────────────────────────
        stage('Update K8s Manifests') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh """
                        git config user.email "jenkins@trendz-cicd.com"
                        git config user.name "Jenkins CI"

                        # Update image tags in deployment manifests
                        sed -i 's|image: .*trendz-backend.*|image: ${ECR_REGISTRY}/${BACKEND_REPO}:${BUILD_NUMBER}|g'  k8s/backend-deployment.yml
                        sed -i 's|image: .*trendz-frontend.*|image: ${ECR_REGISTRY}/${FRONTEND_REPO}:${BUILD_NUMBER}|g' k8s/frontend-deployment.yml
                        sed -i 's|image: .*trendz-admin.*|image: ${ECR_REGISTRY}/${ADMIN_REPO}:${BUILD_NUMBER}|g'      k8s/admin-deployment.yml

                        # Commit and push
                        git add k8s/
                        git commit -m "chore(ci): update image tags to build #${BUILD_NUMBER} [skip ci]" || true
                        git push https://${GITHUB_TOKEN}@github.com/Chethan-044/Trendz.git HEAD:${GIT_BRANCH}
                    """
                }
            }
        }
    }

    // ────────────────────────────────────────────────────────────
    // Post Actions
    // ────────────────────────────────────────────────────────────
    post {
        always {
            // Archive Trivy scan reports
            archiveArtifacts artifacts: '*-trivy-report.txt', allowEmptyArchive: true

            // Clean up Docker images to save disk space
            sh """
                docker rmi ${BACKEND_REPO}:${BUILD_NUMBER}  ${BACKEND_REPO}:latest  || true
                docker rmi ${FRONTEND_REPO}:${BUILD_NUMBER} ${FRONTEND_REPO}:latest || true
                docker rmi ${ADMIN_REPO}:${BUILD_NUMBER}    ${ADMIN_REPO}:latest    || true
                docker rmi ${ECR_REGISTRY}/${BACKEND_REPO}:${BUILD_NUMBER}  ${ECR_REGISTRY}/${BACKEND_REPO}:latest  || true
                docker rmi ${ECR_REGISTRY}/${FRONTEND_REPO}:${BUILD_NUMBER} ${ECR_REGISTRY}/${FRONTEND_REPO}:latest || true
                docker rmi ${ECR_REGISTRY}/${ADMIN_REPO}:${BUILD_NUMBER}    ${ECR_REGISTRY}/${ADMIN_REPO}:latest    || true
            """
            cleanWs()
        }
        success {
            echo '✅ Pipeline completed successfully! ArgoCD will auto-sync the deployment.'
        }
        failure {
            echo '❌ Pipeline failed! Check the stage logs for details.'
        }
    }
}
