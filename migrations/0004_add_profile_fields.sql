-- Add new columns to user_profiles table
ALTER TABLE `user_profiles` 
ADD COLUMN `current_position` VARCHAR(255) NULL AFTER `job_title`,
ADD COLUMN `industry` VARCHAR(255) NULL AFTER `current_position`,
ADD COLUMN `years_of_experience` INT NULL AFTER `industry`,
ADD COLUMN `skills` TEXT NULL AFTER `years_of_experience`,
ADD COLUMN `highest_degree` VARCHAR(100) NULL AFTER `skills`,
ADD COLUMN `field_of_study` VARCHAR(255) NULL AFTER `highest_degree`,
ADD COLUMN `institution` VARCHAR(255) NULL AFTER `field_of_study`,
ADD COLUMN `year_of_graduation` YEAR NULL AFTER `institution`,
ADD COLUMN `additional_certifications` TEXT NULL AFTER `year_of_graduation`,
ADD COLUMN `areas_of_interest` TEXT NULL AFTER `additional_certifications`,
ADD COLUMN `id_proof_path` VARCHAR(255) NULL AFTER `areas_of_interest`,
ADD COLUMN `degree_certificates_path` TEXT NULL AFTER `id_proof_path`,
ADD COLUMN `cv_path` VARCHAR(255) NULL AFTER `degree_certificates_path`,
ADD COLUMN `join_date` DATE NULL AFTER `membership_expiry`;
