-- NPM Database 생성
CREATE DATABASE IF NOT EXISTS npm_db;

-- Survey Database는 이미 생성됨 (docker-compose에서)
USE survey_db;

-- Users 테이블
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Surveys 테이블
CREATE TABLE IF NOT EXISTS surveys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    arxiv_id VARCHAR(50) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    abstract TEXT,
    abstract_translation TEXT,
    authors TEXT,
    published_date DATE,
    pdf_url TEXT,
    categories TEXT,
    difficulty_level VARCHAR(20),
    estimated_reading_time_beginner INT,
    estimated_reading_time_intermediate INT,
    estimated_reading_time_advanced INT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_arxiv_id (arxiv_id),
    INDEX idx_difficulty (difficulty_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Survey Interactions 테이블
CREATE TABLE IF NOT EXISTS user_surveys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    survey_id INT NOT NULL,
    status ENUM('recommended', 'reading', 'completed') DEFAULT 'recommended',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    UNIQUE KEY unique_user_survey (user_id, survey_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Preferences 테이블
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preferred_difficulty VARCHAR(20),
    ai_stacks TEXT,
    domains TEXT,
    keywords TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_pref (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NPM User에게 권한 부여
GRANT ALL PRIVILEGES ON npm_db.* TO 'npm_user'@'%' IDENTIFIED BY 'npm_password';
FLUSH PRIVILEGES;