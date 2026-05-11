-- Add professional and educational fields to user_profiles table
ALTER TABLE `user_profiles`
ADD COLUMN `job_title` VARCHAR(100) DEFAULT NULL COMMENT 'Job title of the user',
ADD COLUMN `employer_organization` VARCHAR(255) DEFAULT NULL COMMENT 'Employer or organization name',
ADD COLUMN `department` VARCHAR(100) DEFAULT NULL COMMENT 'Department or type of library',
ADD COLUMN `years_experience` INT DEFAULT NULL COMMENT 'Years of professional experience',
ADD COLUMN `professional_certifications` TEXT DEFAULT NULL COMMENT 'Comma-separated list of certifications',
ADD COLUMN `linkedin_profile` VARCHAR(255) DEFAULT NULL COMMENT 'LinkedIn profile URL',
ADD COLUMN `areas_of_expertise` TEXT DEFAULT NULL COMMENT 'Comma-separated areas of expertise',
ADD COLUMN `highest_degree` VARCHAR(100) DEFAULT NULL COMMENT 'Highest degree achieved',
ADD COLUMN `field_of_study` VARCHAR(255) DEFAULT NULL COMMENT 'Field(s) of study',
ADD COLUMN `institutions_attended` TEXT DEFAULT NULL COMMENT 'Comma-separated list of institutions',
ADD COLUMN `graduation_years` VARCHAR(255) DEFAULT NULL COMMENT 'Comma-separated graduation years',
MODIFY COLUMN `personal_info` JSON DEFAULT NULL COMMENT 'Stores personal information as JSON' AFTER `graduation_years`,
MODIFY COLUMN `contact_info` JSON DEFAULT NULL AFTER `personal_info`,
MODIFY COLUMN `education` JSON DEFAULT NULL AFTER `contact_info`,
MODIFY COLUMN `employment` JSON DEFAULT NULL AFTER `education`,
MODIFY COLUMN `membership_info` JSON DEFAULT NULL AFTER `employment`;
