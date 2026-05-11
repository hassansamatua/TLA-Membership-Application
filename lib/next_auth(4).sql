-- phpMyAdmin SQL Dump
-- version 4.8.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 10, 2026 at 05:45 AM
-- Server version: 10.1.33-MariaDB
-- PHP Version: 7.2.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `next_auth`
--

DELIMITER $$
--
-- Functions
--
CREATE DEFINER=`root`@`localhost` FUNCTION `calculate_membership_fee` (`p_membership_type` VARCHAR(20), `p_is_new_member` BOOLEAN) RETURNS DECIMAL(10,2) BEGIN
    DECLARE v_fee DECIMAL(10,2);
    
    IF p_membership_type = 'organization' THEN
        SET v_fee = 150000.00;
    ELSEIF p_membership_type = 'librarian' OR p_membership_type = 'regular' THEN
        IF p_is_new_member THEN
            SET v_fee = 40000.00;
        ELSE
            SET v_fee = 30000.00;
        END IF;
    ELSE
        
        SET v_fee = 40000.00;
    END IF;
    
    RETURN v_fee;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `about_content`
--

CREATE TABLE `about_content` (
  `id` int(11) NOT NULL,
  `section_key` varchar(100) NOT NULL,
  `section_type` enum('heading','subheading','text','list_item','image','mission','vision','values') NOT NULL,
  `content` text NOT NULL,
  `order_index` int(11) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `about_content`
--

INSERT INTO `about_content` (`id`, `section_key`, `section_type`, `content`, `order_index`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'about_main_heading', 'heading', 'About Tanzania Library Association', 1, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(2, 'about_description', 'text', 'The Tanzania Library Association (TLA) is the leading professional organization dedicated to advancing library and information services throughout Tanzania.', 2, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(3, 'about_mission', 'mission', 'To promote library development, support information professionals, and advocate for access to knowledge for all Tanzanians.', 3, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(4, 'about_vision', 'vision', 'To be the catalyst for a knowledge-driven society where every Tanzanian has access to quality information services.', 4, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(5, 'about_values_1', 'values', 'Professional Excellence - Maintaining high standards in library and information services.', 5, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(6, 'about_values_2', 'values', 'Community Service - Serving communities through knowledge and information access.', 6, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(7, 'about_values_3', 'values', 'Innovation - Embracing technology and new approaches to information delivery.', 7, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49');

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `check_in_time` datetime DEFAULT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `status` enum('present','absent','excused') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'present',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `contact_content`
--

CREATE TABLE `contact_content` (
  `id` int(11) NOT NULL,
  `section_key` varchar(100) NOT NULL,
  `section_type` enum('heading','text','email','phone','address','map_url','social_link') NOT NULL,
  `content` text NOT NULL,
  `order_index` int(11) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `contact_content`
--

INSERT INTO `contact_content` (`id`, `section_key`, `section_type`, `content`, `order_index`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'contact_main_heading', 'heading', 'Contact Us', 1, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(2, 'contact_description', 'text', 'Get in touch with us for any inquiries about membership, services, or partnerships.', 2, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(3, 'contact_email', 'email', 'info@tla.or.tz', 3, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(4, 'contact_phone', 'phone', '+255 22 211 1234', 4, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(5, 'contact_address', 'address', 'Dar es Salaam, Tanzania', 5, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49');

-- --------------------------------------------------------

--
-- Table structure for table `contact_submissions`
--

CREATE TABLE `contact_submissions` (
  `id` int(11) NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_status` tinyint(1) DEFAULT '0' COMMENT '0 = unread, 1 = read',
  `read_at` timestamp NULL DEFAULT NULL COMMENT 'When the submission was marked as read'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contact_submissions`
--

INSERT INTO `contact_submissions` (`id`, `name`, `email`, `subject`, `message`, `created_at`, `read_status`, `read_at`) VALUES
(1, 'Test User', 'test@example.com', 'Test Subject', 'This is a test message from the contact form test script.', '2026-01-24 03:56:33', 1, '2026-01-24 04:20:28'),
(2, 'name name name', 'hanscovd5@gmail.com', 'fdf', 'rety', '2026-01-24 03:58:06', 1, '2026-01-24 04:19:59'),
(3, 'name name name', 'hanscovd5@gmail.com', 'fdf', 'sjdjk', '2026-01-24 04:02:26', 1, '2026-01-24 04:19:52'),
(5, 'its me', 'hanscodev@gmail.com', 'payment issue', 'i want to pay but it fails', '2026-01-24 05:39:58', 1, '2026-01-26 01:21:33'),
(6, 'NAJUA NAJUA NAJUA', 'adventinaemma@gmail.com', 'payment issue', 'cobifjiu', '2026-01-27 12:42:50', 1, '2026-02-24 07:46:50');

-- --------------------------------------------------------

--
-- Table structure for table `cycle_payment_status`
--

CREATE TABLE `cycle_payment_status` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `cycle_year` int(11) NOT NULL,
  `is_paid` tinyint(1) DEFAULT '0',
  `payment_date` datetime DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT NULL,
  `penalty_amount` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) DEFAULT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `status` enum('unpaid','grace_period','overdue','paid') DEFAULT 'unpaid',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `deleted_users`
--

CREATE TABLE `deleted_users` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `deleted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by` int(11) DEFAULT NULL,
  `reason` text,
  `original_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `deleted_users`
--

INSERT INTO `deleted_users` (`id`, `user_id`, `name`, `email`, `deleted_at`, `deleted_by`, `reason`, `original_data`) VALUES
(1, 7, 'example example example', 'example@gmail.com', '2025-12-28 09:20:50', 3, NULL, '{\"id\":7,\"name\":\"example example example\",\"email\":\"example@gmail.com\",\"password\":\"$2b$10$zUUNgu1ChBrk337.P4JfDu8FRY1mkxe73rhhT7FAMG7tN6QJInPFm\",\"nida\":\"4567890435678949\",\"membership_type\":\"organization\",\"phone_number\":\"123456789\",\"other_phone_number\":null,\"organization_name\":\"Zanzibar University\",\"is_admin\":0,\"is_approved\":1,\"created_at\":\"2025-12-28T07:00:07.000Z\",\"updated_at\":\"2025-12-28T08:50:32.000Z\",\"refresh_token\":null,\"membership_number\":\"MEM2500015\"}'),
(0, 41, 'Hassan Said Samatua', 'hanscovd5@gmail.com', '2026-01-27 13:25:00', NULL, NULL, '{\"id\":41,\"name\":\"Hassan Said Samatua\",\"email\":\"hanscovd5@gmail.com\",\"password\":\"$2b$10$1RSjzbpR7bzBqemc1v94UeNq0sChLLrdVd39Q7g/vO6imNeDlF8h.\",\"nida\":\"1234567890987000\",\"membership_type\":\"regular\",\"phone_number\":\"0643225789\",\"organization_affiliation\":null,\"other_phone_number\":null,\"organization_name\":null,\"is_admin\":0,\"role\":\"member\",\"is_approved\":1,\"created_at\":\"2026-01-27T13:12:39.000Z\",\"updated_at\":\"2026-01-27T13:13:53.000Z\",\"refresh_token\":null,\"membership_number\":\"TLA2619670\",\"last_payment_year\":null,\"payment_status\":null,\"total_penalties\":\"0.00\",\"reset_token\":null,\"reset_token_expires_at\":null,\"contact_person_name\":null,\"contact_person_email\":null,\"is_new_member\":1,\"last_membership_year\":null}');

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` int(11) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('upcoming','ongoing','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'upcoming',
  `capacity` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `fee` decimal(10,2) DEFAULT '0.00',
  `registration_deadline` datetime DEFAULT NULL,
  `payment_deadline_hours` int(11) DEFAULT '72' COMMENT 'Hours after registration when payment is due'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `title`, `description`, `start_time`, `end_time`, `location`, `status`, `capacity`, `created_by`, `created_at`, `updated_at`, `fee`, `registration_deadline`, `payment_deadline_hours`) VALUES
(1004, 'Annual Event', 'Annual Event', '2026-01-31 11:02:00', '2026-01-31 10:02:00', 'mwanza', 'upcoming', 50, 3, '2026-01-27 08:02:46', '2026-01-27 08:05:30', '0.00', NULL, 72),
(1005, 'Conference1', 'Annual Event', '2026-01-30 11:03:00', '2026-01-30 10:03:00', 'Mbeya', 'upcoming', 50, 3, '2026-01-27 08:03:25', '2026-01-27 08:05:30', '5000.00', NULL, 72);

-- --------------------------------------------------------

--
-- Table structure for table `event_payments`
--

CREATE TABLE `event_payments` (
  `id` int(11) NOT NULL,
  `registration_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('mobile_money','bank_transfer','cash','card','online') NOT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `event_payments`
--

INSERT INTO `event_payments` (`id`, `registration_id`, `event_id`, `user_id`, `amount`, `payment_method`, `payment_reference`, `status`, `processed_at`, `created_at`, `updated_at`) VALUES
(1, 1, 4, 9, '15000.00', 'mobile_money', 'MPESA123456789', 'completed', '2026-01-26 13:40:18', '2026-01-26 13:40:18', '2026-01-26 13:49:49'),
(2, 2, 2, 2, '6000.00', 'mobile_money', 'MPESA987654321', 'completed', '2026-01-26 13:50:32', '2026-01-26 13:50:32', '2026-01-26 13:50:32'),
(3, 6, 3, 25, '25000.00', 'bank_transfer', 'TRX20240126001', 'completed', '2026-01-26 13:50:32', '2026-01-26 13:50:32', '2026-01-26 13:50:32'),
(4, 8, 2, 19, '6000.00', 'cash', 'CASH20240126001', 'completed', '2026-01-26 13:50:32', '2026-01-26 13:50:32', '2026-01-26 13:50:32');

-- --------------------------------------------------------

--
-- Table structure for table `event_payments_azampay`
--

CREATE TABLE `event_payments_azampay` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `registration_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'TZS',
  `payment_method` varchar(50) NOT NULL,
  `provider_code` varchar(20) DEFAULT NULL,
  `azampay_reference` varchar(100) NOT NULL,
  `azampay_transaction_id` varchar(100) DEFAULT NULL,
  `azampay_checkout_url` text,
  `order_id` varchar(100) NOT NULL,
  `status` enum('pending','completed','failed','cancelled') DEFAULT 'pending',
  `test_mode` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `event_payments_azampay`
--

INSERT INTO `event_payments_azampay` (`id`, `event_id`, `user_id`, `registration_id`, `amount`, `currency`, `payment_method`, `provider_code`, `azampay_reference`, `azampay_transaction_id`, `azampay_checkout_url`, `order_id`, `status`, `test_mode`, `created_at`, `updated_at`, `processed_at`) VALUES
(2, 2, 25, 0, '6000.00', 'TZS', 'tigopesa', 'TIGOPESA', 'TEST-1769494953825', 'TEST-TXN-1769494953826', 'http://localhost:3000/dashboard/events/payment/success?reference=TEST-1769494953825&test=true', 'EVENT-2-25-1769494953821', 'completed', 1, '2026-01-27 06:22:33', '2026-01-27 06:29:30', '2026-01-27 06:29:30'),
(5, 4, 25, 0, '15000.00', 'TZS', 'tigopesa', 'TIGOPESA', 'TEST-1769495483641', 'TEST-TXN-1769495483641', 'http://localhost:3000/dashboard/events/payment/success?reference=TEST-1769495483641&test=true', 'EVENT-4-25-1769495483639', 'completed', 1, '2026-01-27 06:31:23', '2026-01-27 06:31:26', '2026-01-27 06:31:26'),
(6, 2, 9, 0, '6000.00', 'TZS', 'halopesa', 'HALOPESA', 'TEST-1769496704055', 'TEST-TXN-1769496704055', 'http://localhost:3000/dashboard/events/payment/success?reference=TEST-1769496704055&test=true', 'EVENT-2-9-1769496704053', 'completed', 1, '2026-01-27 06:51:44', '2026-01-27 06:51:47', '2026-01-27 06:51:47'),
(7, 1001, 9, 0, '500000.00', 'TZS', 'halopesa', 'HALOPESA', 'TEST-1769497249088', 'TEST-TXN-1769497249088', 'http://localhost:3000/dashboard/events/payment/success?reference=TEST-1769497249088&test=true', 'EVENT-1001-9-1769497249087', 'completed', 1, '2026-01-27 07:00:49', '2026-01-27 07:00:52', '2026-01-27 07:00:52'),
(8, 1005, 9, 0, '5000.00', 'TZS', 'azampesa', 'AZAMPESA', 'TEST-1769501179581', 'TEST-TXN-1769501179581', 'http://localhost:3000/dashboard/events/payment/success?reference=TEST-1769501179581&test=true', 'EVENT-1005-9-1769501179578', 'completed', 1, '2026-01-27 08:06:19', '2026-01-27 08:06:22', '2026-01-27 08:06:22');

-- --------------------------------------------------------

--
-- Table structure for table `event_payment_callbacks`
--

CREATE TABLE `event_payment_callbacks` (
  `id` int(11) NOT NULL,
  `event_payment_id` int(11) NOT NULL,
  `callback_data` longtext,
  `processed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `event_payment_callbacks`
--

INSERT INTO `event_payment_callbacks` (`id`, `event_payment_id`, `callback_data`, `processed`, `created_at`) VALUES
(1, 5, '{\"reference\":\"TEST-1769495483641\",\"status\":\"SUCCESS\",\"transactionId\":\"TEST-TXN-1769495483641\",\"amount\":\"15000.00\",\"simulated\":true}', 1, '2026-01-27 06:31:26'),
(2, 6, '{\"reference\":\"TEST-1769496704055\",\"status\":\"SUCCESS\",\"transactionId\":\"TEST-TXN-1769496704055\",\"amount\":\"6000.00\",\"simulated\":true}', 1, '2026-01-27 06:51:47'),
(3, 7, '{\"reference\":\"TEST-1769497249088\",\"status\":\"SUCCESS\",\"transactionId\":\"TEST-TXN-1769497249088\",\"amount\":\"500000.00\",\"simulated\":true}', 1, '2026-01-27 07:00:52'),
(4, 8, '{\"reference\":\"TEST-1769501179581\",\"status\":\"SUCCESS\",\"transactionId\":\"TEST-TXN-1769501179581\",\"amount\":\"5000.00\",\"simulated\":true}', 1, '2026-01-27 08:06:22');

-- --------------------------------------------------------

--
-- Table structure for table `event_registrations`
--

CREATE TABLE `event_registrations` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `registered_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('registered','cancelled','attended') DEFAULT 'registered',
  `payment_status` enum('pending','paid','refunded','overdue') DEFAULT 'pending',
  `payment_amount` decimal(10,2) DEFAULT '0.00',
  `paid_at` timestamp NULL DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `unregister_deadline` timestamp NULL DEFAULT NULL COMMENT 'When user will be unregistered if not paid',
  `auto_unregistered` tinyint(1) DEFAULT '0' COMMENT 'Whether user was auto-unregistered for non-payment',
  `auto_unregistered_at` timestamp NULL DEFAULT NULL,
  `payment_gateway` varchar(50) DEFAULT 'manual',
  `azampay_reference` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `event_registrations`
--

INSERT INTO `event_registrations` (`id`, `event_id`, `user_id`, `registered_at`, `status`, `payment_status`, `payment_amount`, `paid_at`, `payment_method`, `payment_reference`, `unregister_deadline`, `auto_unregistered`, `auto_unregistered_at`, `payment_gateway`, `azampay_reference`) VALUES
(3, 2, 2, '2026-01-06 09:27:15', 'registered', 'pending', '0.00', NULL, NULL, NULL, '2026-01-09 09:27:15', 0, NULL, 'manual', NULL),
(4, 2, 23, '2026-01-09 07:42:58', 'registered', 'pending', '0.00', NULL, NULL, NULL, '2026-01-12 07:42:58', 0, NULL, 'manual', NULL),
(6, 3, 25, '2026-01-12 10:58:49', 'registered', 'paid', '25000.00', '2026-01-26 13:50:32', NULL, NULL, '2026-01-15 10:58:49', 0, NULL, 'manual', NULL),
(7, 3, 19, '2026-01-16 09:30:21', 'registered', 'pending', '0.00', NULL, NULL, NULL, '2026-01-19 09:30:21', 0, NULL, 'manual', NULL),
(8, 2, 19, '2026-01-16 09:30:23', 'registered', 'paid', '6000.00', '2026-01-26 13:50:32', NULL, NULL, '2026-01-19 09:30:23', 0, NULL, 'manual', NULL),
(9, 4, 2, '2026-01-16 10:32:01', 'registered', 'pending', '0.00', NULL, NULL, NULL, '2026-01-19 10:32:01', 0, NULL, 'manual', NULL),
(10, 3, 2, '2026-01-16 10:32:05', 'registered', 'pending', '0.00', NULL, NULL, NULL, '2026-01-19 10:32:05', 0, NULL, 'manual', NULL),
(11, 5, 2, '2026-01-16 10:32:07', 'registered', 'pending', '0.00', NULL, NULL, NULL, '2026-01-19 10:32:07', 0, NULL, 'manual', NULL),
(10004, 1000, 29, '2026-01-21 17:33:10', 'registered', 'paid', '15000.00', '2026-01-27 06:31:26', 'mobile_money', 'MPESA123456789', '2026-01-24 17:33:10', 0, NULL, 'azampay', 'TEST-1769495483641'),
(10004, 1000, 29, '2026-01-21 17:33:10', 'registered', 'paid', '15000.00', '2026-01-27 06:31:26', 'mobile_money', 'MPESA123456789', '2026-01-24 17:33:10', 0, NULL, 'azampay', 'TEST-1769495483641'),
(10005, 2, 29, '2026-01-26 10:43:59', 'registered', 'paid', '15000.00', '2026-01-27 06:31:26', 'mobile_money', 'MPESA123456789', '2026-01-29 10:43:59', 0, NULL, 'azampay', 'TEST-1769495483641'),
(10006, 1000, 9, '2026-01-26 11:16:09', 'registered', 'paid', '15000.00', '2026-01-27 06:31:26', 'mobile_money', 'MPESA123456789', '2026-01-29 06:16:09', 0, NULL, 'azampay', 'TEST-1769495483641'),
(10007, 4, 9, '2026-01-26 11:17:19', 'registered', 'paid', '15000.00', '2026-01-27 06:31:26', 'mobile_money', 'MPESA123456789', '2026-01-29 06:17:19', 0, NULL, 'azampay', 'TEST-1769495483641'),
(10003, 2, 25, '2026-01-27 06:01:24', 'registered', 'paid', '6000.00', '2026-01-27 06:31:26', NULL, NULL, '2026-01-30 06:01:24', 0, NULL, 'azampay', 'TEST-1769495483641'),
(10002, 1000, 25, '2026-01-27 06:21:34', 'registered', 'paid', '15000.00', '2026-01-27 06:31:26', NULL, NULL, '2026-01-30 06:21:34', 0, NULL, 'azampay', 'TEST-1769495483641'),
(10001, 4, 25, '2026-01-27 06:31:19', 'registered', 'paid', '15000.00', '2026-01-27 06:31:26', NULL, NULL, '2026-01-30 06:31:19', 0, NULL, 'azampay', 'TEST-1769495483641'),
(10013, 2, 9, '2026-01-27 06:51:38', 'registered', 'paid', '500000.00', '2026-01-27 07:00:52', NULL, NULL, '2026-01-30 06:51:38', 0, NULL, 'azampay', 'TEST-1769497249088'),
(10012, 1002, 9, '2026-01-27 07:00:31', 'registered', 'paid', '500000.00', '2026-01-27 07:00:52', NULL, NULL, '2026-01-30 07:00:31', 0, NULL, 'azampay', 'TEST-1769497249088'),
(10008, 1001, 9, '2026-01-27 07:00:45', 'registered', 'paid', '500000.00', '2026-01-27 07:00:52', NULL, NULL, '2026-01-30 07:00:45', 0, NULL, 'azampay', 'TEST-1769497249088'),
(10021, 1004, 9, '2026-01-27 08:00:04', 'registered', 'paid', '0.00', '2026-01-27 08:00:04', NULL, NULL, '2026-01-30 08:00:04', 0, NULL, 'manual', NULL),
(0, 1005, 9, '2026-01-27 08:06:14', 'registered', 'paid', '5000.00', '2026-01-27 08:06:22', NULL, NULL, '2026-01-30 08:06:14', 0, NULL, 'azampay', 'TEST-1769501179581'),
(0, 1005, 39, '2026-01-27 12:41:19', 'registered', 'pending', '0.00', NULL, NULL, NULL, NULL, 0, NULL, 'manual', NULL),
(0, 1004, 39, '2026-01-27 12:41:24', 'registered', 'pending', '0.00', NULL, NULL, NULL, NULL, 0, NULL, 'manual', NULL),
(0, 1005, 40, '2026-01-27 12:53:18', 'registered', 'pending', '0.00', NULL, NULL, NULL, NULL, 0, NULL, 'manual', NULL),
(0, 1004, 40, '2026-01-27 12:53:21', 'registered', 'pending', '0.00', NULL, NULL, NULL, NULL, 0, NULL, 'manual', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `footer_content`
--

CREATE TABLE `footer_content` (
  `id` int(11) NOT NULL,
  `section_key` varchar(100) NOT NULL,
  `section_type` enum('heading','text','link','copyright','social_link','contact_info') NOT NULL,
  `content` text NOT NULL,
  `url` varchar(500) DEFAULT NULL,
  `order_index` int(11) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `footer_content`
--

INSERT INTO `footer_content` (`id`, `section_key`, `section_type`, `content`, `url`, `order_index`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'footer_about_heading', 'heading', 'About TLA', NULL, 1, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(2, 'footer_about_text', 'text', 'Tanzania Library Association is dedicated to promoting library services, supporting professionals, and advocating for access to knowledge throughout Tanzania.', NULL, 2, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(3, 'footer_quick_links_heading', 'heading', 'Quick Links', NULL, 3, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(4, 'footer_link_about', 'link', 'About Us', '/about-us', 4, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(5, 'footer_link_contact', 'link', 'Contact', '/contact', 5, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(6, 'footer_link_membership', 'link', 'Membership', '/membership', 6, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(7, 'footer_link_events', 'link', 'Events', '/events', 7, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(8, 'footer_contact_heading', 'heading', 'Contact', NULL, 8, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(9, 'footer_contact_email', 'contact_info', 'Email: info@tla.or.tz', NULL, 9, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(10, 'footer_contact_phone', 'contact_info', 'Phone: +255 XXX XXX XXX', NULL, 10, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(11, 'footer_contact_address', 'contact_info', 'Address: Dar es Salaam, Tanzania', NULL, 11, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(12, 'footer_copyright', 'copyright', '© 2026 Tanzania Library Association (TLA). All rights reserved.', NULL, 12, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49');

-- --------------------------------------------------------

--
-- Table structure for table `home_content`
--

CREATE TABLE `home_content` (
  `id` int(11) NOT NULL,
  `section_key` varchar(100) NOT NULL,
  `section_type` enum('heading','subheading','text','list_item','image') NOT NULL,
  `content` text NOT NULL,
  `order_index` int(11) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `home_content`
--

INSERT INTO `home_content` (`id`, `section_key`, `section_type`, `content`, `order_index`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'home_main_heading', 'heading', 'Welcome to Tanzania Library Association', 1, 1, '2026-01-02 08:24:48', '2026-01-02 08:24:48'),
(2, 'home_main_subheading', 'subheading', 'Empowering Knowledge, Connecting Communities', 2, 1, '2026-01-02 08:24:48', '2026-01-02 08:24:48'),
(3, 'home_membership_heading', 'heading', 'Membership Benefits', 3, 1, '2026-01-02 08:24:48', '2026-01-02 08:24:48'),
(4, 'home_membership_item_1', 'list_item', 'Access Books - Borrow books online and offline with easy tracking.', 4, 1, '2026-01-02 08:24:48', '2026-01-02 08:24:48'),
(5, 'home_membership_item_2', 'list_item', 'Digital Resources - Access e-books, journals, and research materials 24/7.', 5, 1, '2026-01-02 08:24:48', '2026-01-02 08:24:48'),
(6, 'home_membership_item_3', 'list_item', 'Community Events - Join workshops, reading clubs, and library events.', 6, 1, '2026-01-02 08:24:48', '2026-01-02 08:24:48');

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL,
  `item_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT '0',
  `available_quantity` int(11) NOT NULL DEFAULT '0',
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('available','low_stock','out_of_stock','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `last_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `login_logs`
--

CREATE TABLE `login_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `login_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `media`
--

CREATE TABLE `media` (
  `id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `description` text,
  `media_type` enum('image','video','document','audio','other') DEFAULT 'other',
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `memberships`
--

CREATE TABLE `memberships` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `membership_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `membership_type` enum('personal','organization') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','expired','suspended','pending') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `joined_date` date NOT NULL,
  `expiry_date` date NOT NULL,
  `payment_status` enum('paid','pending','overdue','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_date` date DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cycle_year` int(11) DEFAULT NULL,
  `is_new_user_cycle` tinyint(1) DEFAULT '0',
  `penalty_amount` decimal(10,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `memberships`
--

INSERT INTO `memberships` (`id`, `user_id`, `membership_number`, `membership_type`, `status`, `joined_date`, `expiry_date`, `payment_status`, `payment_date`, `amount_paid`, `created_at`, `updated_at`, `payment_method`, `reference`, `payment_reference`, `cycle_year`, `is_new_user_cycle`, `penalty_amount`) VALUES
(2, 4, 'TLA2500012', 'personal', 'active', '2025-08-15', '2026-11-17', 'paid', '2025-12-20', '29.99', '2025-12-28 10:20:41', '2026-01-05 06:30:54', NULL, NULL, NULL, NULL, 0, '0.00'),
(3, 6, 'TLA2500014', 'personal', 'active', '2025-04-02', '2026-11-19', 'paid', '2025-12-22', '29.99', '2025-12-28 10:20:41', '2026-01-05 06:30:54', NULL, NULL, NULL, NULL, 0, '0.00'),
(4, 8, 'TLA2500009', 'personal', 'active', '2025-08-19', '2026-03-31', 'paid', '2025-12-03', '29.99', '2025-12-28 10:20:41', '2026-01-05 06:30:54', NULL, NULL, NULL, NULL, 0, '0.00'),
(10, 13, 'TLA2671130', '', 'active', '2026-01-02', '2026-01-30', 'paid', '2026-01-02', '33000.00', '2026-01-02 11:46:23', '2026-01-05 07:42:52', NULL, NULL, NULL, NULL, 0, '0.00'),
(14, 26, 'TLA2626122', 'personal', 'active', '2026-01-15', '2027-01-15', 'paid', '2026-01-15', '40000.00', '2026-01-15 14:38:44', '2026-01-21 19:26:26', NULL, NULL, NULL, NULL, 0, '0.00'),
(20, 9, 'TLA2651360', 'personal', 'active', '2026-01-15', '2027-01-15', 'paid', '2026-01-15', '40000.00', '2026-01-15 16:12:48', '2026-01-21 19:26:26', 'Test Payment', 'TEST-1768493565066', NULL, NULL, 0, '0.00'),
(24, 2, 'TLA2627042', 'personal', 'active', '2026-01-21', '2027-01-31', 'paid', '2026-01-21', '30000.00', '2026-01-16 08:59:52', '2026-01-21 19:27:01', 'Test Payment', 'TEST-1768553989651', NULL, NULL, 0, '0.00'),
(26, 19, 'TLA2668070', 'personal', 'active', '2026-01-16', '2027-01-16', 'paid', '2026-01-16', '40000.00', '2026-01-16 09:22:02', '2026-01-21 19:26:26', 'Test Payment', 'TEST-1768555319080', NULL, NULL, 0, '0.00'),
(27, 23, 'TLA2630345', 'personal', 'active', '2026-01-16', '2027-01-16', 'paid', '2026-01-16', '40000.00', '2026-01-16 10:41:42', '2026-01-21 19:26:26', 'Test Payment', 'TEST-1768560099256', NULL, NULL, 0, '0.00'),
(29, 27, 'TLA2628427', 'organization', 'active', '2026-01-16', '2027-01-16', 'paid', '2026-01-16', '150000.00', '2026-01-16 11:25:03', '2026-01-21 19:26:26', 'Test Payment', 'TEST-1768562691476', NULL, NULL, 0, '0.00'),
(31, 28, 'TLA2643984', 'personal', 'active', '2026-01-16', '2027-01-16', 'paid', '2026-01-16', '40000.00', '2026-01-16 11:55:42', '2026-01-21 19:26:26', 'Test Payment', 'TEST-1768564539156', NULL, NULL, 0, '0.00'),
(0, 29, 'TLA2607284', '', 'active', '2026-01-21', '2027-01-31', 'paid', '2026-01-21', '30000.00', '2026-01-21 19:42:25', '2026-01-21 19:42:25', 'Test Payment', 'MANUAL-FIX', NULL, NULL, 0, '0.00'),
(0, 25, 'TLA2600013', 'personal', 'active', '0000-00-00', '2027-01-21', 'paid', '2026-01-21', '40000.00', '2026-01-21 19:50:44', '2026-01-21 19:50:44', NULL, NULL, NULL, NULL, 0, '0.00'),
(0, 39, 'TLA2600014', 'personal', 'active', '0000-00-00', '2027-01-27', 'paid', '2026-01-27', '40000.00', '2026-01-27 12:40:05', '2026-01-27 12:40:05', NULL, NULL, NULL, NULL, 0, '0.00'),
(0, 40, 'TLA2600015', 'personal', 'active', '0000-00-00', '2027-01-27', 'paid', '2026-01-27', '30000.00', '2026-01-27 13:02:40', '2026-01-27 13:09:36', NULL, NULL, NULL, NULL, 0, '0.00'),
(0, 34, 'TLA2550540', 'personal', 'active', '0000-00-00', '2026-01-31', 'paid', '2026-01-27', '40000.00', '2026-01-27 13:28:05', '2026-01-27 13:28:05', 'test', 'TEST-1769519927-8628', NULL, 2025, 0, '0.00'),
(0, 42, 'TLA2600016', 'personal', 'active', '0000-00-00', '2027-01-27', 'paid', '2026-01-27', '40000.00', '2026-01-27 14:41:09', '2026-01-27 14:41:09', NULL, NULL, NULL, NULL, 0, '0.00');

-- --------------------------------------------------------

--
-- Table structure for table `membership_cycles`
--

CREATE TABLE `membership_cycles` (
  `id` int(11) NOT NULL,
  `cycle_year` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `grace_period_end` date NOT NULL,
  `penalty_start_date` date NOT NULL,
  `base_fee` decimal(10,2) NOT NULL DEFAULT '50000.00',
  `penalty_per_month` decimal(10,2) NOT NULL DEFAULT '1000.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `membership_cycles`
--

INSERT INTO `membership_cycles` (`id`, `cycle_year`, `start_date`, `end_date`, `grace_period_end`, `penalty_start_date`, `base_fee`, `penalty_per_month`, `created_at`, `updated_at`) VALUES
(1, 2025, '2025-02-01', '2026-01-31', '2025-04-01', '2025-04-01', '50000.00', '1000.00', '2026-01-15 16:03:06', '2026-01-15 16:03:06'),
(2, 2026, '2026-02-01', '2027-01-31', '2026-04-01', '2026-04-01', '50000.00', '1000.00', '2026-01-15 16:03:06', '2026-01-15 16:03:06'),
(3, 2027, '2027-02-01', '2028-01-31', '2027-04-01', '2027-04-01', '50000.00', '1000.00', '2026-01-15 16:03:06', '2026-01-15 16:03:06'),
(4, 2028, '2028-02-01', '2029-01-31', '2028-04-01', '2028-04-01', '50000.00', '1000.00', '2026-01-15 16:03:06', '2026-01-15 16:03:06');

-- --------------------------------------------------------

--
-- Table structure for table `membership_fees`
--

CREATE TABLE `membership_fees` (
  `membership_type` varchar(12) DEFAULT NULL,
  `is_new_member` int(1) DEFAULT NULL,
  `fee` decimal(8,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `membership_payments`
--

CREATE TABLE `membership_payments` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `reference` varchar(100) NOT NULL,
  `payment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
  `cycle_year` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `membership_type` enum('librarian','organization','regular') NOT NULL DEFAULT 'regular',
  `is_new_member` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `membership_payments`
--

INSERT INTO `membership_payments` (`id`, `user_id`, `amount`, `payment_method`, `reference`, `payment_date`, `status`, `cycle_year`, `created_at`, `updated_at`, `membership_type`, `is_new_member`) VALUES
(11, 2, '40000.00', 'Test Payment', 'TEST-1768490550', '2026-01-15 18:22:30', 'completed', 2026, '2026-01-15 18:22:30', '2026-01-16 14:06:18', '', 1),
(12, 2, '40000.00', 'Test Payment', 'TEST-1768490568', '2026-01-15 18:22:48', 'completed', 2026, '2026-01-15 18:22:48', '2026-01-16 14:06:18', '', 1),
(13, 9, '40000.00', 'Test Payment', 'TEST-1768491772939', '2026-01-15 18:42:53', 'completed', 2026, '2026-01-15 18:42:53', '2026-01-16 14:06:18', '', 1),
(14, 9, '40000.00', 'Test Payment', 'TEST-1768491772939', '2026-01-15 18:42:56', 'completed', 2026, '2026-01-15 18:42:56', '2026-01-16 14:06:18', '', 1),
(15, 9, '40000.00', 'Test Payment', 'TEST-1768491772939', '2026-01-15 18:42:56', 'completed', 2026, '2026-01-15 18:42:56', '2026-01-16 14:06:18', '', 1),
(16, 9, '40000.00', 'Test Payment', 'TEST-1768493565066', '2026-01-15 19:12:45', 'completed', 2026, '2026-01-15 19:12:45', '2026-01-16 14:06:18', '', 1),
(17, 9, '40000.00', 'Test Payment', 'TEST-1768493565066', '2026-01-15 19:12:48', 'completed', 2026, '2026-01-15 19:12:48', '2026-01-16 14:06:18', '', 1),
(18, 9, '40000.00', 'Test Payment', 'TEST-1768493565066', '2026-01-15 19:12:48', 'completed', 2026, '2026-01-15 19:12:48', '2026-01-16 14:06:18', '', 1),
(19, 2, '40000.00', 'Test Payment', 'TEST-1768553843130', '2026-01-16 11:57:23', 'completed', 2026, '2026-01-16 11:57:23', '2026-01-16 14:06:18', '', 1),
(20, 2, '40000.00', 'Test Payment', 'TEST-1768553843130', '2026-01-16 11:57:26', 'completed', 2026, '2026-01-16 11:57:26', '2026-01-16 14:06:18', '', 1),
(21, 2, '40000.00', 'Test Payment', 'TEST-1768553843130', '2026-01-16 11:57:26', 'completed', 2026, '2026-01-16 11:57:26', '2026-01-16 14:06:18', '', 1),
(22, 2, '40000.00', 'Test Payment', 'TEST-1768553989651', '2026-01-16 11:59:49', 'completed', 2026, '2026-01-16 11:59:49', '2026-01-16 14:06:18', '', 1),
(23, 2, '40000.00', 'Test Payment', 'TEST-1768553989651', '2026-01-16 11:59:52', 'completed', 2026, '2026-01-16 11:59:52', '2026-01-16 14:06:18', '', 1),
(24, 2, '40000.00', 'Test Payment', 'TEST-1768553989651', '2026-01-16 11:59:52', 'completed', 2026, '2026-01-16 11:59:52', '2026-01-16 14:06:18', '', 1),
(25, 19, '40000.00', 'Test Payment', 'TEST-1768555319080', '2026-01-16 12:21:59', 'completed', 2026, '2026-01-16 12:21:59', '2026-01-16 14:06:18', '', 1),
(27, 19, '40000.00', 'Test Payment', 'TEST-1768555319080', '2026-01-16 12:22:02', 'completed', 2026, '2026-01-16 12:22:02', '2026-01-16 14:06:18', '', 1),
(28, 23, '40000.00', 'Test Payment', 'TEST-1768560099256', '2026-01-16 13:41:39', 'completed', 2026, '2026-01-16 13:41:39', '2026-01-16 14:06:18', '', 1),
(29, 23, '40000.00', 'Test Payment', 'TEST-1768560099256', '2026-01-16 13:41:42', 'completed', 2026, '2026-01-16 13:41:42', '2026-01-16 14:06:18', '', 1),
(31, 27, '150000.00', 'Test Payment', 'TEST-1768562691476', '2026-01-16 14:24:51', 'completed', 2026, '2026-01-16 14:24:51', '2026-01-16 14:24:51', 'regular', 1),
(32, 27, '150000.00', 'Test Payment', 'TEST-1768562691476', '2026-01-16 14:25:03', 'completed', 2026, '2026-01-16 14:25:03', '2026-01-16 14:25:03', 'regular', 1),
(34, 28, '40000.00', 'Test Payment', 'TEST-1768564539156', '2026-01-16 14:55:39', 'completed', 2026, '2026-01-16 14:55:39', '2026-01-16 14:55:39', 'regular', 1),
(35, 28, '40000.00', 'Test Payment', 'TEST-1768564539156', '2026-01-16 14:55:42', 'completed', 2026, '2026-01-16 14:55:42', '2026-01-16 14:55:42', 'regular', 1),
(37, 2, '30000.00', 'Test Payment', 'TEST-1768566514225', '2026-01-16 15:28:34', 'completed', 2026, '2026-01-16 15:28:34', '2026-01-16 15:28:34', 'regular', 1),
(0, 2, '30000.00', 'Test Payment', 'TEST-1768988439948', '2026-01-21 12:40:39', 'completed', 2026, '2026-01-21 12:40:39', '2026-01-21 12:40:39', 'regular', 1),
(0, 2, '30000.00', 'Test Payment', 'TEST-1768988439948', '2026-01-21 12:40:43', 'completed', 2026, '2026-01-21 12:40:43', '2026-01-21 12:40:43', 'regular', 1),
(0, 29, '40000.00', 'Test Payment', 'TEST-1769017156171', '2026-01-21 20:39:16', 'completed', 2026, '2026-01-21 20:39:16', '2026-01-21 20:39:16', 'regular', 1),
(0, 29, '40000.00', 'Test Payment', 'TEST-1769017156171', '2026-01-21 20:39:19', 'completed', 2026, '2026-01-21 20:39:19', '2026-01-21 20:39:19', 'regular', 1),
(0, 29, '30000.00', 'Test Payment', 'TEST-1769018869809', '2026-01-21 21:07:49', 'completed', 2026, '2026-01-21 21:07:49', '2026-01-21 21:07:49', 'regular', 1),
(0, 29, '30000.00', 'Test Payment', 'TEST-1769018869809', '2026-01-21 21:07:53', 'completed', 2026, '2026-01-21 21:07:53', '2026-01-21 21:07:53', 'regular', 1),
(0, 29, '30000.00', 'Test Payment', 'TEST-1769021906728', '2026-01-21 21:58:26', 'completed', 2026, '2026-01-21 21:58:26', '2026-01-21 21:58:26', 'regular', 1),
(0, 29, '30000.00', 'Test Payment', 'TEST-1769023676646', '2026-01-21 22:27:56', 'completed', 2026, '2026-01-21 22:27:56', '2026-01-21 22:27:56', 'regular', 1),
(0, 25, '40000.00', 'Test Payment', 'TEST-1769025044102', '2026-01-21 22:50:44', 'completed', 2026, '2026-01-21 22:50:44', '2026-01-21 22:50:44', 'regular', 1),
(0, 39, '40000.00', 'Test Payment', 'TEST-1769517605434', '2026-01-27 15:40:05', 'completed', 2026, '2026-01-27 15:40:05', '2026-01-27 15:40:05', 'regular', 1),
(0, 40, '40000.00', 'Test Payment', 'TEST-1769518960862', '2026-01-27 16:02:40', 'completed', 2026, '2026-01-27 16:02:40', '2026-01-27 16:02:40', 'regular', 1),
(0, 40, '30000.00', 'Test Payment', 'TEST-1769519376575', '2026-01-27 16:09:36', 'completed', 2026, '2026-01-27 16:09:36', '2026-01-27 16:09:36', 'regular', 1),
(0, 34, '40000.00', 'test', 'TEST-1769519927-8628', '2026-01-27 16:28:05', 'completed', 2025, '2026-01-27 16:28:05', '2026-01-27 16:28:05', 'regular', 1),
(0, 42, '40000.00', 'Test Payment', 'TEST-1769524869012', '2026-01-27 17:41:09', 'completed', 2026, '2026-01-27 17:41:09', '2026-01-27 17:41:09', 'regular', 1);

-- --------------------------------------------------------

--
-- Table structure for table `membership_sequence`
--

CREATE TABLE `membership_sequence` (
  `last_number` int(11) NOT NULL DEFAULT '0',
  `year` varchar(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `membership_sequence`
--

INSERT INTO `membership_sequence` (`last_number`, `year`) VALUES
(193, '25'),
(16, '26');

-- --------------------------------------------------------

--
-- Table structure for table `menu_items`
--

CREATE TABLE `menu_items` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `url` varchar(500) NOT NULL,
  `menu_name` varchar(100) DEFAULT 'main',
  `parent_id` int(11) DEFAULT NULL,
  `order_index` int(11) DEFAULT '0',
  `target` enum('_self','_blank') DEFAULT '_self',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `menu_items`
--

INSERT INTO `menu_items` (`id`, `title`, `url`, `menu_name`, `parent_id`, `order_index`, `target`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Home', '/', 'main', NULL, 1, '_self', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(2, 'About Us', '/about-us', 'main', NULL, 2, '_self', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(3, 'Membership', '/membership', 'main', NULL, 3, '_self', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(4, 'Events', '/events', 'main', NULL, 4, '_self', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(5, 'Resources', '/resources', 'main', NULL, 5, '_self', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(6, 'Contact', '/contact', 'main', NULL, 6, '_self', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23');

-- --------------------------------------------------------

--
-- Table structure for table `navbar_content`
--

CREATE TABLE `navbar_content` (
  `id` int(11) NOT NULL,
  `section_key` varchar(100) NOT NULL,
  `section_type` enum('logo','menu_item','dropdown_item','button') NOT NULL,
  `content` text NOT NULL,
  `url` varchar(500) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `order_index` int(11) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `navbar_content`
--

INSERT INTO `navbar_content` (`id`, `section_key`, `section_type`, `content`, `url`, `parent_id`, `order_index`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'navbar_logo', 'logo', 'TLA', '/', NULL, 1, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(2, 'navbar_menu_home', 'menu_item', 'Home', '/', NULL, 2, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(3, 'navbar_menu_about', 'menu_item', 'About Us', '/about-us', NULL, 3, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(4, 'navbar_menu_membership', 'menu_item', 'Membership', '/membership', NULL, 4, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(5, 'navbar_menu_events', 'menu_item', 'Events', '/events', NULL, 5, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(6, 'navbar_menu_contact', 'menu_item', 'Contact', '/contact', NULL, 6, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(7, 'navbar_menu_resources', 'menu_item', 'Resources', '/resources', NULL, 7, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49'),
(8, 'navbar_login_button', 'button', 'Login', '/auth/login', NULL, 8, 1, '2026-01-02 08:24:49', '2026-01-02 08:24:49');

-- --------------------------------------------------------

--
-- Table structure for table `news_notifications`
--

CREATE TABLE `news_notifications` (
  `id` int(11) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'News/Notification title',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'News/Notification content',
  `type` enum('news','notification','announcement','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'news' COMMENT 'Type of message',
  `target_audience` enum('all','members','admin','specific') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all' COMMENT 'Who can see this message',
  `target_users` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Specific user IDs if target_audience is specific',
  `sender_id` int(11) NOT NULL COMMENT 'Admin who sent the message',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium' COMMENT 'Message priority',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether message is active',
  `expires_at` datetime DEFAULT NULL COMMENT 'When message expires',
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When message was sent',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='News and notifications sent by admin';

--
-- Dumping data for table `news_notifications`
--

INSERT INTO `news_notifications` (`id`, `title`, `message`, `type`, `target_audience`, `target_users`, `sender_id`, `priority`, `is_active`, `expires_at`, `sent_at`, `created_at`, `updated_at`) VALUES
(3, 'Conference And AGM', 'You are Invited to attend the TLA Conference and General annual Meeting ', 'notification', 'all', NULL, 3, 'medium', 1, NULL, '2026-01-12 13:19:08', '2026-01-12 10:19:08', '2026-01-16 10:38:40'),
(4, 'New Cycle', 'the new cycle will begin on Feb 1 2026. makes sure you pay your mbmership fee for the next cycle before April 1', 'news', 'all', NULL, 3, 'high', 1, '2026-04-01 00:00:00', '2026-01-21 11:52:44', '2026-01-21 08:52:44', '2026-01-21 17:22:53'),
(5, 'news', 'this is news', 'news', 'all', NULL, 3, 'medium', 1, '2026-01-24 00:00:00', '2026-01-21 14:09:10', '2026-01-21 11:09:10', '2026-01-21 17:22:53'),
(0, 'New Cycle Begin', 'the new cycle is begin so makes sure you pay your membership fee', 'news', 'all', NULL, 35, 'urgent', 1, '2027-01-31 00:00:00', '2026-02-24 10:46:23', '2026-02-24 07:46:23', '2026-02-24 07:46:23'),
(0, 'gtrjfrk', 'iuiuiiuui', 'urgent', 'all', NULL, 35, 'urgent', 1, '2026-03-28 00:00:00', '2026-03-05 11:29:07', '2026-03-05 08:29:07', '2026-03-05 08:29:07');

-- --------------------------------------------------------

--
-- Table structure for table `pages`
--

CREATE TABLE `pages` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `content` longtext,
  `excerpt` text,
  `status` enum('draft','published','archived') DEFAULT 'draft',
  `page_type` enum('page','post','custom') DEFAULT 'page',
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text,
  `meta_keywords` text,
  `featured_image` varchar(500) DEFAULT NULL,
  `template` varchar(100) DEFAULT 'default',
  `author_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `pages`
--

INSERT INTO `pages` (`id`, `title`, `slug`, `content`, `excerpt`, `status`, `page_type`, `meta_title`, `meta_description`, `meta_keywords`, `featured_image`, `template`, `author_id`, `created_at`, `updated_at`) VALUES
(1, 'Home', 'home', '<h1>Welcome to TLA</h1><p>Tanzania Library and Information Association is dedicated to promoting library and information services in Tanzania.</p>jn', NULL, 'published', 'page', 'Home - TLA', 'Welcome to Tanzania Library and Information Association', NULL, NULL, 'default', NULL, '2026-01-02 08:24:23', '2026-01-09 08:04:01'),
(2, 'About Us', 'about-us', '<h1>About TLA</h1><p>The Tanzania Library and Information Association (TLA) is a professional organization...</p>', NULL, 'published', 'page', 'About Us - TLA', 'Learn about Tanzania Library and Information Association', NULL, NULL, 'default', NULL, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(3, 'Contact', 'contact', '<h1>Contact Us</h1><p>Get in touch with TLA for more information...</p>', NULL, 'published', 'page', 'Contact - TLA', 'Contact Tanzania Library and Information Association', NULL, NULL, 'default', NULL, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(4, 'Membership', 'membership', '<h1>Membership</h1><p>Join TLA and become part of our professional community...</p>', NULL, 'published', 'page', 'Membership - TLA', 'TLA Membership Information', NULL, NULL, 'default', NULL, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(5, 'Events', 'events', '<h1>Events</h1><p>Upcoming events and activities organized by TLA...</p>', NULL, 'published', 'page', 'Events - TLA', 'TLA Events and Activities', NULL, NULL, 'default', NULL, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(6, 'Resources', 'resources', '<h1>Resources</h1><p>Library and information resources for our members...</p>', NULL, 'published', 'page', 'Resources - TLA', 'TLA Resources and Materials', NULL, NULL, 'default', NULL, '2026-01-02 08:24:23', '2026-01-02 08:24:23');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `reference` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `membership_type` enum('personal','organization') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'TZS',
  `status` enum('pending','completed','failed') DEFAULT 'pending',
  `payment_method` varchar(50) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `checkout_url` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paid_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `cycle_year` int(11) DEFAULT NULL,
  `penalty_amount` decimal(10,2) DEFAULT '0.00',
  `is_new_member` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `reference`, `user_id`, `membership_type`, `amount`, `currency`, `status`, `payment_method`, `phone_number`, `transaction_id`, `checkout_url`, `created_at`, `paid_at`, `updated_at`, `cycle_year`, `penalty_amount`, `is_new_member`) VALUES
(48, 'TLA-1768487067630-wdb5gwyk3', 26, '', '40000.00', 'TZS', 'completed', 'halopesa', '0626776318', NULL, 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768487067637&test=true', '2026-01-15 14:24:27', NULL, '2026-01-16 11:06:18', NULL, '0.00', 1),
(49, 'TLA-1768487662923-9bfwm3o26', 26, '', '40000.00', 'TZS', 'completed', 'halopesa', '0626776318', NULL, 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768487662940&test=true', '2026-01-15 14:34:22', '2026-01-15 14:38:44', '2026-01-16 11:06:18', NULL, '0.00', 1),
(50, 'TLA-1768487989660-88v5gkv0z', 26, '', '40000.00', 'TZS', 'pending', 'halopesa', '0626776318', NULL, 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768487989666&test=true', '2026-01-15 14:39:49', NULL, '2026-01-16 11:06:18', NULL, '0.00', 1),
(51, 'TLA-1768488122698-0j8tbt1ks', 23, '', '40000.00', 'TZS', 'pending', 'halopesa', '0626776318', NULL, 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768488122704&test=true', '2026-01-15 14:42:02', NULL, '2026-01-16 11:06:18', NULL, '0.00', 1),
(52, 'TLA-1768488866389-frf09p67a', 23, '', '40000.00', 'TZS', 'pending', 'halopesa', '0626776318', NULL, 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768488866398&test=true', '2026-01-15 14:54:26', NULL, '2026-01-16 11:06:18', NULL, '0.00', 1),
(53, 'TLA-1768488936168-epo4snetd', 23, '', '40000.00', 'TZS', 'pending', 'halopesa', '0626776318', NULL, 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768488936288&test=true', '2026-01-15 14:55:36', NULL, '2026-01-16 11:06:18', NULL, '0.00', 1),
(54, 'TLA-1768490201640-lsfry88qe', 9, '', '40000.00', 'TZS', 'pending', 'halopesa', '0626776318', NULL, 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768490201660&test=true', '2026-01-15 15:16:41', NULL, '2026-01-16 11:06:18', NULL, '0.00', 1),
(55, 'TEST-1768490397', 2, '', '40000.00', 'TZS', 'pending', 'Test Payment', NULL, NULL, NULL, '2026-01-15 15:19:57', NULL, '2026-01-16 11:06:18', NULL, '0.00', 1),
(56, 'TEST-1768490450', 2, '', '40000.00', 'TZS', 'pending', 'Test Payment', NULL, NULL, NULL, '2026-01-15 15:20:50', NULL, '2026-01-16 11:06:18', NULL, '0.00', 1),
(57, 'TEST-1768490550', 2, '', '40000.00', 'TZS', 'completed', 'Test Payment', NULL, NULL, NULL, '2026-01-15 15:22:30', '2026-01-15 15:22:30', '2026-01-16 11:06:18', NULL, '0.00', 1),
(58, 'TEST-1768490568', 2, '', '40000.00', 'TZS', 'completed', 'Test Payment', NULL, NULL, NULL, '2026-01-15 15:22:48', '2026-01-15 15:22:48', '2026-01-16 11:06:18', NULL, '0.00', 1),
(59, 'TLA-1768490628625-pg2eutrqp', 9, '', '40000.00', 'TZS', 'pending', 'halopesa', '0626776318', NULL, 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768490628632&test=true', '2026-01-15 15:23:48', NULL, '2026-01-16 11:06:18', NULL, '0.00', 1),
(60, 'TLA-1768490981057-g8hmpi0ep', 9, '', '40000.00', 'TZS', 'pending', 'halopesa', '0626776318', NULL, 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768490981065&test=true', '2026-01-15 15:29:41', NULL, '2026-01-16 11:06:18', NULL, '0.00', 1),
(61, 'TEST-1768491457103', 9, '', '40000.00', 'TZS', 'completed', 'Test Payment', '0626776318', 'TEST-TXN-1768491457103', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768491457103&test=true', '2026-01-15 15:37:37', '2026-01-15 15:37:37', '2026-01-16 11:06:18', NULL, '0.00', 1),
(62, 'TEST-1768491772939', 9, '', '40000.00', 'TZS', 'completed', 'Test Payment', '0626776318', 'TEST-TXN-1768491772939', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768491772939&test=true', '2026-01-15 15:42:52', '2026-01-15 15:42:56', '2026-01-16 11:06:18', NULL, '0.00', 1),
(63, 'TEST-1768493350686', 9, '', '40000.00', 'TZS', 'completed', 'Test Payment', '0626776318', 'TEST-TXN-1768493350686', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768493350686&test=true', '2026-01-15 16:09:10', '2026-01-15 16:09:10', '2026-01-16 11:06:18', NULL, '0.00', 1),
(64, 'TEST-1768493565066', 9, '', '40000.00', 'TZS', 'completed', 'Test Payment', '0626776318', 'TEST-TXN-1768493565066', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768493565066&test=true', '2026-01-15 16:12:45', '2026-01-15 16:12:48', '2026-01-16 11:06:18', NULL, '0.00', 1),
(65, 'TEST-1768553843130', 2, '', '40000.00', 'TZS', 'completed', 'Test Payment', '0626776318', 'TEST-TXN-1768553843130', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768553843130&test=true', '2026-01-16 08:57:23', '2026-01-16 08:57:26', '2026-01-16 11:06:18', NULL, '0.00', 1),
(66, 'TEST-1768553989651', 2, '', '40000.00', 'TZS', 'completed', 'Test Payment', '0676776318', 'TEST-TXN-1768553989651', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768553989651&test=true', '2026-01-16 08:59:49', '2026-01-16 08:59:52', '2026-01-16 11:06:18', NULL, '0.00', 1),
(67, 'TEST-1768555319080', 19, '', '40000.00', 'TZS', 'completed', 'Test Payment', '0622345678', 'TEST-TXN-1768555319080', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768555319080&test=true', '2026-01-16 09:21:59', '2026-01-16 09:21:59', '2026-01-16 11:06:18', NULL, '0.00', 1),
(68, 'TEST-1768560099256', 23, '', '40000.00', 'TZS', 'completed', 'Test Payment', '0751346789', 'TEST-TXN-1768560099256', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768560099256&test=true', '2026-01-16 10:41:39', '2026-01-16 10:41:39', '2026-01-16 11:06:18', NULL, '0.00', 1),
(69, 'TEST-1768562623030', 27, 'organization', '150000.00', 'TZS', 'completed', 'Test Payment', '0626776318', 'TEST-TXN-1768562623030', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768562623030&test=true', '2026-01-16 11:23:43', '2026-01-16 11:23:43', '2026-01-16 11:23:43', NULL, '0.00', 1),
(70, 'TEST-1768562691476', 27, 'organization', '150000.00', 'TZS', 'completed', 'Test Payment', '0626776318', 'TEST-TXN-1768562691477', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768562691476&test=true', '2026-01-16 11:24:51', '2026-01-16 11:24:51', '2026-01-16 11:25:03', NULL, '0.00', 1),
(71, 'TEST-1768564539156', 28, 'personal', '40000.00', 'TZS', '', 'Test Payment', '0626735689', 'TEST-TXN-1768564539156', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768564539156&test=true', '2026-01-16 11:55:39', '2026-01-16 11:55:39', '2026-01-26 10:38:54', NULL, '0.00', 1),
(72, 'TEST-1768566514225', 2, 'personal', '30000.00', 'TZS', '', 'Test Payment', '0626776318', 'TEST-TXN-1768566514225', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768566514225&test=true', '2026-01-16 12:28:34', '2026-01-16 12:28:34', '2026-01-26 10:42:41', NULL, '0.00', 1),
(0, 'TEST-1768988439948', 2, 'personal', '30000.00', 'TZS', '', 'Test Payment', '0626776318', 'TEST-TXN-1768988439949', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1768988439948&test=true', '2026-01-21 09:40:39', '2026-01-21 09:40:39', '2026-01-26 10:42:30', NULL, '0.00', 1),
(0, 'TEST-1769017156171', 29, 'personal', '40000.00', 'TZS', '', 'Test Payment', '1234 5678 9012 3456', 'TEST-TXN-1769017156171', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1769017156171&test=true', '2026-01-21 17:39:16', '2026-01-21 17:39:16', '2026-01-26 10:42:30', NULL, '0.00', 1),
(0, 'TEST-1769018869809', 29, 'personal', '30000.00', 'TZS', '', 'Test Payment', '0626776318', 'TEST-TXN-1769018869809', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1769018869809&test=true', '2026-01-21 18:07:49', '2026-01-21 18:07:49', '2026-01-26 10:42:30', NULL, '0.00', 1),
(0, 'TEST-1769021906728', 29, 'personal', '30000.00', 'TZS', '', 'Test Payment', '0626776318', 'TEST-TXN-1769021906728', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1769021906728&test=true', '2026-01-21 18:58:26', '2026-01-21 18:58:26', '2026-01-26 10:42:30', NULL, '0.00', 1),
(0, 'TEST-1769023676646', 29, 'personal', '30000.00', 'TZS', '', 'Test Payment', '0626776318', 'TEST-TXN-1769023676646', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1769023676646&test=true', '2026-01-21 19:27:56', '2026-01-21 19:27:56', '2026-01-26 10:42:30', NULL, '0.00', 1),
(0, 'TEST-1769025044102', 25, 'personal', '40000.00', 'TZS', '', 'Test Payment', '0626776318', 'TEST-TXN-1769025044102', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1769025044102&test=true', '2026-01-21 19:50:44', '2026-01-21 19:50:44', '2026-01-26 10:42:30', NULL, '0.00', 1),
(0, 'TEST-1769493858009', 25, '', '40000.00', 'TZS', 'completed', 'test', NULL, NULL, NULL, '2026-01-27 03:04:19', NULL, '2026-01-27 03:04:19', NULL, '0.00', 1),
(0, 'TEST-1769493858009', 25, '', '40000.00', 'TZS', 'completed', 'test', NULL, NULL, NULL, '2026-01-27 03:04:19', NULL, '2026-01-27 03:04:19', NULL, '0.00', 1),
(0, 'TEST-1769494833643', 25, '', '40000.00', 'TZS', 'completed', 'test', NULL, NULL, NULL, '2026-01-27 03:20:34', NULL, '2026-01-27 03:20:34', NULL, '0.00', 1),
(0, 'TEST-1769517605434', 39, 'personal', '40000.00', 'TZS', 'completed', 'Test Payment', '0626776318', 'TEST-TXN-1769517605434', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1769517605434&test=true', '2026-01-27 12:40:05', '2026-01-27 12:40:05', '2026-01-27 12:40:05', NULL, '0.00', 1),
(0, 'TEST-1769518960862', 40, 'personal', '40000.00', 'TZS', 'completed', 'Test Payment', '0752345670', 'TEST-TXN-1769518960862', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1769518960862&test=true', '2026-01-27 13:02:40', '2026-01-27 13:02:40', '2026-01-27 13:02:40', NULL, '0.00', 1),
(0, 'TEST-1769519376575', 40, 'personal', '30000.00', 'TZS', 'completed', 'Test Payment', '0626776318', 'TEST-TXN-1769519376575', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1769519376575&test=true', '2026-01-27 13:09:36', '2026-01-27 13:09:36', '2026-01-27 13:09:36', NULL, '0.00', 1),
(0, 'TEST-1769519927-8628', 34, 'personal', '40000.00', 'TZS', 'completed', 'test', NULL, NULL, NULL, '2026-01-27 13:18:47', '2026-01-27 13:28:05', '2026-01-27 13:28:05', NULL, '0.00', 1),
(0, 'TEST-1769520622-35', 35, 'personal', '40000.00', 'TZS', 'pending', 'test', NULL, NULL, NULL, '2026-01-27 13:30:22', NULL, '2026-01-27 13:30:22', NULL, '0.00', 1),
(0, 'TEST-1769520622-36', 36, 'personal', '40000.00', 'TZS', 'pending', 'test', NULL, NULL, NULL, '2026-01-27 13:30:22', NULL, '2026-01-27 13:30:22', NULL, '0.00', 1),
(0, 'TEST-1769520622-37', 37, 'personal', '40000.00', 'TZS', 'pending', 'test', NULL, NULL, NULL, '2026-01-27 13:30:22', NULL, '2026-01-27 13:30:22', NULL, '0.00', 1),
(0, 'TEST-1769520622-38', 38, 'personal', '40000.00', 'TZS', 'pending', 'test', NULL, NULL, NULL, '2026-01-27 13:30:22', NULL, '2026-01-27 13:30:22', NULL, '0.00', 1),
(0, 'TEST-1769524869012', 42, 'personal', '40000.00', 'TZS', 'completed', 'Test Payment', '0626776318', 'TEST-TXN-1769524869013', 'http://localhost:3000/dashboard/payment/success?reference=TEST-1769524869012&test=true', '2026-01-27 14:41:09', '2026-01-27 14:41:09', '2026-01-27 14:41:09', NULL, '0.00', 1);

-- --------------------------------------------------------

--
-- Table structure for table `payment_notifications`
--

CREATE TABLE `payment_notifications` (
  `id` int(11) NOT NULL,
  `registration_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `notification_type` enum('payment_reminder','payment_overdue','unregistered','payment_received') NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `email_sent` tinyint(1) DEFAULT '0',
  `sms_sent` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `payment_notifications`
--

INSERT INTO `payment_notifications` (`id`, `registration_id`, `user_id`, `notification_type`, `sent_at`, `email_sent`, `sms_sent`) VALUES
(1, 0, 9, 'payment_received', '2026-01-26 13:40:18', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `payment_reminders`
--

CREATE TABLE `payment_reminders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `payment_year` int(4) NOT NULL,
  `reminder_type` enum('payment_due','grace_period','overdue') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `email_sent` tinyint(1) NOT NULL DEFAULT '0',
  `sms_sent` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Payment reminder records';

-- --------------------------------------------------------

--
-- Table structure for table `penalty_notifications`
--

CREATE TABLE `penalty_notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `cycle_year` int(11) NOT NULL,
  `notification_type` enum('approval','grace_period_reminder','penalty_warning','overdue_notice') NOT NULL,
  `sent_via` enum('email','sms','both') DEFAULT 'email',
  `sent_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `acknowledged` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `penalty_notifications`
--

INSERT INTO `penalty_notifications` (`id`, `user_id`, `cycle_year`, `notification_type`, `sent_via`, `sent_date`, `acknowledged`, `created_at`) VALUES
(1, 9, 2026, '', 'email', '2026-01-15 20:06:39', 0, '2026-01-15 17:06:39'),
(2, 27, 2026, '', 'email', '2026-01-16 15:33:45', 0, '2026-01-16 12:33:45'),
(0, 42, 2026, '', 'email', '2026-01-27 17:05:36', 0, '2026-01-27 14:05:36');

-- --------------------------------------------------------

--
-- Table structure for table `site_settings`
--

CREATE TABLE `site_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` longtext,
  `setting_type` enum('string','number','boolean','json','array') DEFAULT 'string',
  `setting_group` varchar(50) DEFAULT 'general',
  `description` text,
  `is_public` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `site_settings`
--

INSERT INTO `site_settings` (`id`, `setting_key`, `setting_value`, `setting_type`, `setting_group`, `description`, `is_public`, `created_at`, `updated_at`) VALUES
(1, 'site_name', 'TLA Organization', 'string', 'general', 'Site name', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(2, 'site_description', 'Tanzania Library and Information Association', 'string', 'general', 'Site description', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(3, 'site_url', 'https://tla.or.tz', 'string', 'general', 'Site URL', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(4, 'admin_email', 'admin@tla.or.tz', 'string', 'general', 'Admin email', 0, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(5, 'contact_email', 'info@tla.or.tz', 'string', 'general', 'Contact email', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(6, 'contact_phone', '+255 22 211 1234', 'string', 'general', 'Contact phone', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(7, 'contact_address', 'Dar es Salaam, Tanzania', 'string', 'general', 'Contact address', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(8, 'social_media', '{\"facebook\": \"https://facebook.com/tla\", \"twitter\": \"https://twitter.com/tla\", \"linkedin\": \"https://linkedin.com/company/tla\", \"instagram\": \"https://instagram.com/tla\"}', 'json', 'general', 'Social media links', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(9, 'seo_settings', '{\"meta_title\": \"TLA - Tanzania Library and Information Association\", \"meta_description\": \"Official website of TLA\", \"keywords\": \"tla, library, information, association, tanzania\"}', 'json', 'seo', 'SEO settings', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(10, 'theme_settings', '{\"primary_color\": \"#10b981\", \"secondary_color\": \"#6b7280\", \"font_family\": \"Inter\", \"logo_url\": \"/logo.png\"}', 'json', 'theme', 'Theme settings', 0, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(11, 'footer_settings', '{\"copyright_text\": \"© 2025 TLA. All rights reserved.\", \"show_social_links\": true, \"show_contact_info\": true}', 'json', 'footer', 'Footer settings', 1, '2026-01-02 08:24:23', '2026-01-02 08:24:23'),
(12, 'membership_settings', '{\"enable_registration\": true, \"require_approval\": true, \"default_membership_type\": \"personal\", \"membership_duration\": \"1 year\"}', 'json', 'membership', 'Membership settings', 0, '2026-01-02 08:24:23', '2026-01-02 08:24:23');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nida` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `membership_type` enum('librarian','regular','organization') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'regular',
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_affiliation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `other_phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_admin` tinyint(1) DEFAULT '0',
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `is_approved` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `refresh_token` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `membership_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_payment_year` int(4) DEFAULT NULL,
  `payment_status` enum('current','overdue','grace_period') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_penalties` decimal(10,2) NOT NULL DEFAULT '0.00',
  `reset_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expires_at` timestamp NULL DEFAULT NULL,
  `contact_person_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_person_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_new_member` tinyint(1) DEFAULT '1',
  `last_membership_year` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `nida`, `membership_type`, `phone_number`, `organization_affiliation`, `other_phone_number`, `organization_name`, `is_admin`, `role`, `is_approved`, `created_at`, `updated_at`, `refresh_token`, `membership_number`, `last_payment_year`, `payment_status`, `total_penalties`, `reset_token`, `reset_token_expires_at`, `contact_person_name`, `contact_person_email`, `is_new_member`, `last_membership_year`) VALUES
(34, 'NAJUA NAJUA NAJUA', 'najua@gmail.com', '$2b$10$Qs2AgpGIwPupzIvi9nWM1OQGAPD6YBBQ8Hdnhd1XMI/w9.yXRUbme', '1234567890987023', 'regular', '', NULL, NULL, NULL, 0, 'member', 1, '2026-01-27 11:54:35', '2026-01-27 12:34:43', NULL, 'TLA2690446', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(35, 'Admin User', 'admin@example.com', '$2b$10$GnKq4XXAwxiYdh0GG3ARNuTJs97.3rhvEMriGYJyP8o1r02UmoaF2', '1234567890123456', 'librarian', '0712345678', NULL, NULL, NULL, 1, 'member', 1, '2026-01-27 12:00:12', '2026-01-27 12:32:32', NULL, 'TLA2670492', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(36, 'System Admin', 'admin@tla.com', '$2b$10$GnKq4XXAwxiYdh0GG3ARNuTJs97.3rhvEMriGYJyP8o1r02UmoaF2', '1234567890123456', 'librarian', '0712345678', NULL, NULL, NULL, 1, 'member', 1, '2026-01-27 12:29:19', '2026-01-27 12:32:32', NULL, 'TLA2699999', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(37, 'Test Admin', 'test@tla.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAg6o7R9u0WpP2v7eK', '9999888877776666', 'librarian', '0711222334', NULL, NULL, NULL, 1, 'member', 1, '2026-01-27 12:31:52', '2026-01-27 12:31:52', NULL, 'TLA2600001', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(38, 'Simple Test', 'test@test.com', '$2b$10$rFOFlOy94aZ/SiFtF5UbL.Gq1qzhWQtLqDpwVfStYj5NLKmCB4Yxm', '1111222233334444', 'regular', '0711111111', NULL, NULL, NULL, 0, 'member', 1, '2026-01-27 12:33:34', '2026-01-27 12:34:31', NULL, 'TLA2600002', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(39, 'user1 test one', 'user1@gmail.com', '$2b$10$eFpW3YjadTAf1eUf.ZZMgu8l75voTAmX7Poo9vmtl2ymX4mqa.wda', '1234567890987010', 'regular', '', NULL, NULL, NULL, 0, 'member', 1, '2026-01-27 12:36:39', '2026-01-27 12:38:39', NULL, 'TLA2619976', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(40, 'user2 test user', 'user2@gmail.com', '$2b$10$M1w5xXBpcn/NckwnnI1bS.CuJUDMLfNPqiS2IPkXrR7P0vnE0JkfC', '1234561234568900', 'regular', '', NULL, NULL, NULL, 0, 'member', 1, '2026-01-27 12:49:24', '2026-01-27 12:51:07', NULL, 'TLA2655042', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(42, 'Hassan Said Samatua', 'hanscovd5@gmail.com', '$2b$10$poNksIL6rihePBu7toAv0uyBz3KzNEikkeLARj4o7DOyD1dfgcZb6', '1234567890987001', 'regular', '0643225789', NULL, NULL, NULL, 0, 'member', 1, '2026-01-27 14:04:45', '2026-01-27 14:40:31', NULL, 'TLA2633387', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL);

--
-- Triggers `users`
--
DELIMITER $$
CREATE TRIGGER `generate_membership_number` BEFORE UPDATE ON `users` FOR EACH ROW BEGIN
    
    IF NEW.is_approved = 1 AND OLD.is_approved = 0 AND (NEW.membership_number IS NULL OR NEW.membership_number = '') THEN
        
        SET NEW.membership_number = CONCAT(
            'TLA', 
            RIGHT(YEAR(CURDATE()), 2), 
            LPAD(FLOOR(RAND() * 100000), 5, '0')
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `users_backup`
--

CREATE TABLE `users_backup` (
  `id` int(11) NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nida` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `membership_type` enum('librarian','regular','organization') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'regular',
  `phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_affiliation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `other_phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_admin` tinyint(1) DEFAULT '0',
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member' COMMENT 'User role: admin, member, staff, etc.',
  `is_approved` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `refresh_token` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `membership_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_payment_year` int(4) DEFAULT NULL COMMENT 'Last year for which payment was made',
  `payment_status` enum('current','overdue','grace_period') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Current payment status',
  `total_penalties` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Total accumulated penalties',
  `reset_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expires_at` timestamp NULL DEFAULT NULL,
  `contact_person_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_person_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_new_member` tinyint(1) DEFAULT '1',
  `last_membership_year` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `users_backup`
--

INSERT INTO `users_backup` (`id`, `name`, `email`, `password`, `nida`, `membership_type`, `phone_number`, `organization_affiliation`, `other_phone_number`, `organization_name`, `is_admin`, `role`, `is_approved`, `created_at`, `updated_at`, `refresh_token`, `membership_number`, `last_payment_year`, `payment_status`, `total_penalties`, `reset_token`, `reset_token_expires_at`, `contact_person_name`, `contact_person_email`, `is_new_member`, `last_membership_year`) VALUES
(2, 'HASSANI SAID SAMATUA', 'juma@gmail.com', 'c625cd969e5060e9997dfcdefb459523b73dd0952f33f58c9c8a45b511b49e7e', NULL, '', NULL, NULL, NULL, NULL, 0, 'member', 1, '2025-12-26 08:26:26', '2026-01-22 09:26:58', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqdW1hQGdtYWlsLmNvbSIsImlzQWRtaW4iOjAsInR5cGUiOiJyZWZyZXNoIiwidG9rZW5JZCI6ImY2ODg2YzBhOTNlZmQ4OGNiOWU3NDQ3MzFhMTA1NmUyIiwiaWF0IjoxNzY2NzYyNzk4LCJleHAiOjE3NjczNjc1OTh9.Q3XeZVhoKfHuOgkHmL_F2GIwZ3TkcaSUyYLIIOwiJ2g', 'TLA2500010', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(3, 'Admin User', 'admin@example.com', '$2b$10$5z3fNoZkAoa4cOI4f/2fBOA4P7XOT5P1rg.wkY5amC2dDvn3VEZ0m', NULL, '', NULL, NULL, NULL, NULL, 1, 'admin', 1, '2025-12-26 08:44:38', '2026-01-16 11:05:44', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsImlzQWRtaW4iOjEsInR5cGUiOiJyZWZyZXNoIiwidG9rZW5JZCI6IjkyMzllYTc2Zjk2ODI5MWU5OTkxMjZlMjYwMmFiZGMyIiwiaWF0IjoxNzY2NzYyNzg3LCJleHAiOjE3NjczNjc1ODd9.-umGA1UKx8Jf6cLCQAXoVV7UlY6-ordwHUMBBfOBXfY', 'TLA2500011', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(4, 'kombo juma', 'kombo@gmail.com', '$2b$10$8OUE7MFIRYIs8tyEjOALSO3EueDYUyH83XQGFpgJc/Q6fCfx9./eG', NULL, '', NULL, NULL, NULL, NULL, 0, 'member', 1, '2025-12-26 12:41:45', '2026-01-16 11:05:44', NULL, 'TLA2500012', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(6, 'hassan jumasalum', 'hanscovd@gmail.com', '$2b$10$c4X4uhX3PD7GINLsG/m0t.2qL7HIi7HUj.qeNE0Xg2yZd4PnRpRJC', '4567890435678945', '', '89765043', NULL, NULL, NULL, 0, 'member', 1, '2025-12-27 15:47:54', '2026-01-16 11:05:44', NULL, 'TLA2500014', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(8, 'hassan said samatua', 'hassansamatua60@gmail.com', '66282489af0ee984e339dcedec427b176b63c4bf99d34b6cd687ba45eedc1042', '4567890435678947', '', '0626776318', NULL, NULL, NULL, 0, 'member', 1, '2025-12-28 07:45:37', '2026-01-22 09:32:37', NULL, 'TLA2620903', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(9, 'Adventina Emanuel Grevas', 'adventinaemma@gmail.com', '$2b$10$COzlbZYFidy0YgnxspP3wOV8MC8HqgUGZIXykNvdTHdpG1PJ48FFW', '4567890435678942', '', '0626776319', NULL, NULL, NULL, 0, 'member', 1, '2025-12-28 08:52:58', '2026-01-16 11:05:44', NULL, 'TLA2500016', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(11, 'Shabani Ali Shabani', 'shaban@gmail.com', '$2b$10$eYbYiVB6PtMH0v.7W7Ywlul16SKbsXvHj3wAmw0uPDtQKNAGan7ou', '4567890435678930', '', '89765043', NULL, NULL, NULL, 0, 'member', 1, '2025-12-30 10:24:44', '2026-01-16 11:05:44', NULL, 'TLA2500115', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(12, 'JAMAL Juma Jamal', 'jamal@gmail.com', '$2b$10$7UB73U2a/ajGOrThcAXojOdzN.9tJa2Xf94RhdpJOgjJKV0VDqNCm', '4567890435678111', '', '89765043', NULL, NULL, NULL, 0, 'member', 1, '2025-12-30 12:08:20', '2026-01-16 11:05:44', NULL, 'TLA2637742', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(13, 'james joseph james', 'james@gmail.com', '$2b$10$eGZmHfRiALDC81WxV6AEBO4UR5W8Y3/WkoOXNWB9dHVzGU6hO81BW', '4567890435678222', '', '89765043', NULL, NULL, NULL, 0, 'member', 1, '2025-12-31 11:08:03', '2026-01-16 11:05:44', NULL, 'TLA2671130', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(19, 'example example example', 'hassan@gmail.com', '$2b$10$6uLl1QUMogkONv/iacGL9eC6ryp3jeLpS/VnoCr2X4fOqO0hv9Rlu', '4567890435678666', '', '0626776318', NULL, NULL, NULL, 0, 'member', 1, '2026-01-05 07:13:36', '2026-01-16 11:05:44', NULL, 'TLA216102', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(23, 'Abbas Omar Ali', 'abbasamo@gmail.com', '$2b$10$54KReA2A20SD/uWl0zqjI.1xiftojjGpihrwelrMWFomNtxym1F6G', '4567890435678564', '', '0772286363', NULL, NULL, NULL, 0, 'member', 1, '2026-01-08 07:14:19', '2026-01-16 11:05:44', NULL, 'TLA2691594', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(24, 'Amina Juma Juma', 'amina@gmail.com', '$2b$10$aDOeI0dSEYekP3CEWY8WYu11F19rSW/dHl0S28S2PMn8uCKdzLgj.', '4567890435678457', '', '0626776318', NULL, NULL, NULL, 0, 'member', 1, '2026-01-12 09:11:06', '2026-01-16 11:05:44', NULL, 'TLA2623787', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(25, 'Jafar  Juma Jafar', 'jafar@gmail.com', '$2b$10$K8BSnE4g1lsCEvAFQUGo/eUZryCUR0iKpFZIAUiVEhdVAsyfVIe1S', '4567890435678943', '', '0626776318', NULL, NULL, NULL, 0, 'member', 1, '2026-01-12 09:29:21', '2026-01-16 11:05:44', NULL, 'TLA2631887', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(26, 'eg eg eg', 'eg@gmail.com', '$2b$10$L/oFoLYg0mB3utCCyAGm8u4dVyylgnX2ypeo4u/6mc1iTlBVj3AW2', '4567890435678426', '', '0626776318', NULL, NULL, NULL, 0, 'member', 1, '2026-01-15 11:38:10', '2026-01-16 11:05:44', NULL, 'TLA2687954', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(27, 'Zanzibar University', 'hanscovd5@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', '4567890435678725', 'organization', '0771234567', NULL, NULL, 'Zanzibar University', 0, 'member', 1, '2026-01-16 11:20:19', '2026-01-22 09:28:32', NULL, NULL, NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(28, 'Abbas Omar Ali', 'abasamo@gmail.com', '9ce0e89de99c8474bb4977091f12eaad5cb7d9e291e73900d1fa55487d85abd7', '4567890435678294', 'librarian', '0771234567', NULL, NULL, NULL, 0, 'member', 1, '2026-01-16 11:52:30', '2026-01-22 09:26:55', NULL, 'TLA000028', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(29, 'name name name', 'name@gmail.com', '$2b$10$vXNIX/Rpma3rFrfBuXe/DO4ILtLEdWLPnPISyTQ/05Gf1io9ecUEu', '1234567890987654', 'librarian', '0643225789', NULL, NULL, NULL, 0, 'member', 1, '2026-01-21 07:37:58', '2026-01-21 17:19:51', NULL, 'TLA2607284', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(30, 'nameless  namesless nameless', 'nameless@gmail.com', '$2b$10$8H.srHTMBAXroxKEzt5YtepJvt0T0jqd0JWfQsjObf7mzeIx..GOm', '1234567890987000', 'regular', '', NULL, NULL, NULL, 0, 'member', 1, '2026-01-27 11:17:14', '2026-01-27 11:33:41', NULL, 'TLA-2026-0001', NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(0, 'sijui suji', 'sijui@gmail.com', '$2b$10$atnsrX7LrD0q4c4oOk9RxOic9SJMBBzNox5HvMIMH61fuDFqaidgC', '1234567890987001', 'regular', '', NULL, NULL, NULL, 0, 'member', 1, '2026-01-27 11:25:26', '2026-01-27 11:26:16', NULL, NULL, NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL),
(0, 'NAJUA NAJUA NAJUA', 'najua@gmail.com', '$2b$10$JIh3Nbgj0JUmF44zcR73hOT3WWJXEIj1j8eByvLR75ukPF8B4iSnC', '1234567890987023', 'regular', '0643225789', NULL, NULL, NULL, 0, 'member', 0, '2026-01-27 11:47:39', '2026-01-27 11:47:39', NULL, NULL, NULL, NULL, '0.00', NULL, NULL, NULL, NULL, 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_membership_status`
--

CREATE TABLE `user_membership_status` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_new_member` tinyint(1) DEFAULT '1',
  `first_membership_cycle` int(11) DEFAULT NULL,
  `current_cycle_year` int(11) NOT NULL,
  `status` enum('active','inactive','suspended','expired') DEFAULT 'active',
  `payment_status` enum('paid','grace_period','overdue','pending') DEFAULT 'pending',
  `last_payment_date` datetime DEFAULT NULL,
  `next_due_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `user_notification_reads`
--

CREATE TABLE `user_notification_reads` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `notification_id` int(11) NOT NULL,
  `read_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When user read the notification'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Track which users have read notifications';

--
-- Dumping data for table `user_notification_reads`
--

INSERT INTO `user_notification_reads` (`id`, `user_id`, `notification_id`, `read_at`) VALUES
(5, 25, 3, '2026-01-12 13:56:46'),
(6, 26, 3, '2026-01-15 14:46:01'),
(7, 2, 3, '2026-01-16 09:07:43'),
(8, 19, 3, '2026-01-16 12:24:25'),
(9, 23, 3, '2026-01-16 13:41:07'),
(10, 27, 3, '2026-01-16 14:23:09'),
(11, 28, 3, '2026-01-16 15:03:43'),
(0, 2, 0, '2026-01-21 12:15:57'),
(0, 29, 5, '2026-01-21 20:23:10'),
(0, 9, 4, '2026-01-26 15:14:02'),
(0, 9, 3, '2026-01-26 15:14:02');

-- --------------------------------------------------------

--
-- Table structure for table `user_profiles`
--

CREATE TABLE `user_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `profile_picture` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_position` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `years_of_experience` int(11) DEFAULT NULL,
  `skills` text COLLATE utf8mb4_unicode_ci,
  `highest_degree` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `field_of_study` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `institution` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year_of_graduation` year(4) DEFAULT NULL,
  `additional_certifications` text COLLATE utf8mb4_unicode_ci,
  `areas_of_interest` text COLLATE utf8mb4_unicode_ci,
  `id_proof_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `degree_certificates_path` text COLLATE utf8mb4_unicode_ci,
  `cv_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `twitter` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linkedin` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `github` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `facebook` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instagram` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `place_of_birth` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passport_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `membership_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `membership_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `membership_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `membership_expiry` date DEFAULT NULL,
  `join_date` date DEFAULT NULL,
  `personal_info` text COLLATE utf8mb4_unicode_ci,
  `contact_info` text COLLATE utf8mb4_unicode_ci,
  `education` text COLLATE utf8mb4_unicode_ci,
  `employment` text COLLATE utf8mb4_unicode_ci,
  `membership_info` text COLLATE utf8mb4_unicode_ci,
  `professional_certifications` text COLLATE utf8mb4_unicode_ci,
  `linkedin_profile` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_profiles`
--

INSERT INTO `user_profiles` (`id`, `user_id`, `phone`, `address`, `city`, `state`, `country`, `postal_code`, `bio`, `profile_picture`, `cover_photo`, `company`, `job_title`, `current_position`, `industry`, `years_of_experience`, `skills`, `highest_degree`, `field_of_study`, `institution`, `year_of_graduation`, `additional_certifications`, `areas_of_interest`, `id_proof_path`, `degree_certificates_path`, `cv_path`, `website`, `twitter`, `linkedin`, `github`, `facebook`, `instagram`, `date_of_birth`, `gender`, `nationality`, `place_of_birth`, `id_number`, `passport_number`, `membership_number`, `membership_type`, `membership_status`, `membership_expiry`, `join_date`, `personal_info`, `contact_info`, `education`, `employment`, `membership_info`, `professional_certifications`, `linkedin_profile`, `created_at`, `updated_at`) VALUES
(1, 2, NULL, 'Address 2', 'Kisumu', 'Kisumu County', 'Kenya', '000002', 'Professional bio for user HASSANI SAID SAMATUA. Experienced in technology and innovation.', '/uploads/profile-pictures/f100f0f4-11d8-43d9-93df-f5fa57ddb491.jpeg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-30', NULL, 'Tanzanian', NULL, NULL, NULL, 'TLA2500010', '', 'Active', '2027-01-21', '2025-12-24', '{\"fullName\":\"HASSANI SAID SAMATUA\",\"name\":\"HASSANI SAID SAMATUA\",\"gender\":\"\",\"date_of_birth\":\"2025-12-30\",\"id_number\":\"\",\"nationality\":\"Tanzanian\",\"place_of_birth\":\"\"}', '{\"email\":\"juma@gmail.com\",\"phone\":\"+254740574318\",\"address\":\"Address 2\",\"city\":\"Kisumu\",\"country\":\"Kenya\",\"postalCode\":\"000002\"}', '[{\"highestDegree\":\"\",\"institution\":\"\",\"yearOfGraduation\":\"\",\"additionalCertifications\":\"\"}]', '{\"occupation\":\"Software Developer\",\"company\":\"\",\"industry\":\"\",\"yearsOfExperience\":\"\",\"specialization\":\"\",\"skills\":[]}', '{\"membership\":{\"membershipType\":\"Standard\",\"membershipNumber\":\"TLA2500010\",\"membershipStatus\":\"Active\",\"joinDate\":\"2025-12-24T21:00:00.000Z\",\"areasOfInterest\":\"\"},\"payment\":{\"paymentMethod\":\"\",\"accountNumber\":\"\",\"bankName\":\"\",\"cardNumber\":\"\",\"expiryDate\":\"\",\"cvv\":\"\"},\"participation\":{\"previousEvents\":[],\"areasOfInterest\":[],\"volunteerInterest\":false}}', NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(2, 3, NULL, 'Address 3', 'Nairobi', 'Nairobi County', 'Kenya', '000003', 'Professional bio for user Admin User. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2500011', '', 'Active', '2027-01-21', '2025-12-26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(3, 4, NULL, 'Address 4', 'Mombasa', 'Mombasa County', 'Kenya', '000004', 'Professional bio for user kombo juma. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2500012', '', 'Active', '2027-01-21', '2025-12-26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(4, 6, '89765043', 'Address 6', 'Nairobi', 'Nairobi County', 'Kenya', '000006', 'Professional bio for user hassan jumasalum. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2500014', '', 'Active', '2027-01-21', '2025-12-27', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(5, 8, '0626776318', 'Address 8', 'Kisumu', 'Kisumu County', 'Kenya', '000008', 'Professional bio for user hassan said samatua. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2620903', '', 'Active', '2027-01-21', '2025-12-28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(6, 9, '0626776319', 'Address 9', 'Nairobi', 'Nairobi County', 'Kenya', '000009', 'Professional bio for user Adventina Emanuel Grevas. Experienced in technology and innovation.', '/uploads/profile-pictures/c19a1b03-f2ab-49d3-b891-946b13ecb930.jpeg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Tanzanian', NULL, NULL, NULL, 'TLA2500016', '', 'Active', '2027-01-21', '2025-12-27', '{}', '{\"email\":\"adventinaemma@gmail.com\",\"phone\":\"0626776319\",\"address\":\"Address 9\",\"city\":\"Nairobi\",\"country\":\"Kenya\",\"postalCode\":\"000009\"}', '[{\"highestDegree\":\"\",\"institution\":\"\",\"yearOfGraduation\":\"\",\"additionalCertifications\":\"\"}]', '{\"occupation\":\"\",\"company\":\"\",\"industry\":\"\",\"yearsOfExperience\":\"\",\"specialization\":\"\",\"skills\":[]}', '{\"membership\":{\"membershipType\":\"\",\"membershipNumber\":\"TLA2500016\",\"membershipStatus\":\"Active\",\"joinDate\":\"2025-12-27T21:00:00.000Z\",\"areasOfInterest\":\"\"},\"payment\":{\"paymentMethod\":\"\",\"accountNumber\":\"\",\"bankName\":\"\",\"cardNumber\":\"\",\"expiryDate\":\"\",\"cvv\":\"\"},\"participation\":{\"previousEvents\":[],\"areasOfInterest\":[],\"volunteerInterest\":false}}', NULL, NULL, '2026-01-21 07:18:33', '2026-01-27 07:27:54'),
(7, 11, '89765043', 'Address 11', 'Kisumu', 'Kisumu County', 'Kenya', '000011', 'Professional bio for user Shabani Ali Shabani. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2500115', '', 'Active', '2027-01-21', '2025-12-30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(8, 12, '89765043', 'Address 12', 'Nairobi', 'Nairobi County', 'Kenya', '000012', 'Professional bio for user JAMAL Juma Jamal. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2637742', '', 'Active', '2027-01-21', '2025-12-30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(9, 13, '89765043', 'Address 13', 'Mombasa', 'Mombasa County', 'Kenya', '000013', 'Professional bio for user james joseph james. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2671130', '', 'Active', '2027-01-21', '2025-12-31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(10, 19, '0626776318', 'Address 19', 'Mombasa', 'Mombasa County', 'Kenya', '000019', 'Professional bio for user example example example. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA216102', '', 'Active', '2027-01-21', '2026-01-05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(11, 23, '0772286363', 'Address 23', 'Kisumu', 'Kisumu County', 'Kenya', '000023', 'Professional bio for user Abbas Omar Ali. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2691594', '', 'Active', '2027-01-21', '2026-01-08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(12, 24, '0626776318', 'Address 24', 'Nairobi', 'Nairobi County', 'Kenya', '000024', 'Professional bio for user Amina Juma Juma. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2623787', '', 'Active', '2027-01-21', '2026-01-12', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(13, 25, '0626776318', 'Address 25', 'Mombasa', 'Mombasa County', 'Kenya', '000025', 'Professional bio for user Jafar  Juma Jafar. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2631887', '', 'Active', '2027-01-21', '2026-01-12', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(14, 26, '0626776318', 'Address 26', 'Kisumu', 'Kisumu County', 'Kenya', '000026', 'Professional bio for user eg eg eg. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA2687954', '', 'Active', '2027-01-21', '2026-01-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(15, 27, '0771234567', 'Address 27', 'Nairobi', 'Nairobi County', 'Kenya', '000027', 'Professional bio for user Zanzibar University. Experienced in technology and innovation.', NULL, NULL, 'Zanzibar University', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'organization', 'Active', '2027-01-21', '2026-01-16', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(16, 28, '0771234567', 'Address 28', 'Mombasa', 'Mombasa County', 'Kenya', '000028', 'Professional bio for user Abbas Omar Ali. Experienced in technology and innovation.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TLA000028', 'librarian', 'Active', '2027-01-21', '2026-01-16', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-21 07:18:33', '2026-01-21 07:39:30'),
(32, 29, '0643225789', 'skk 12', 'Mpanda', 'Katavi', 'Tanzania', '123', NULL, '/uploads/profile-pictures/e802e96d-6be0-4390-98d1-fd5448b2f981.jpeg', NULL, NULL, NULL, 'Library Manager', NULL, NULL, 'Library', 'Bachelor', NULL, 'Zanzibar University', 2019, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-02', 'male', 'Tanzanian', 'Mtwara', NULL, NULL, 'TLA2607284', 'librarian', 'active', NULL, '2026-01-15', '{\"fullName\":\"name name name\",\"name\":\"name name name\",\"gender\":\"male\",\"date_of_birth\":\"2026-01-02\",\"id_number\":\"\",\"nationality\":\"Tanzanian\",\"place_of_birth\":\"Mtwara\"}', '{\"email\":\"name@gmail.com\",\"phone\":\"0643225789\",\"address\":\"skk 12\",\"city\":\"Mpanda\",\"country\":\"Tanzania\",\"postalCode\":\"123\"}', '[{\"highestDegree\":\"masters\",\"institution\":\"\",\"yearOfGraduation\":\"2020\",\"additionalCertifications\":\"MBA\"},{\"highestDegree\":\"\",\"institution\":\"\",\"yearOfGraduation\":\"\",\"additionalCertifications\":\"\"}]', '{\"occupation\":\"Library Manager\",\"company\":\"\",\"industry\":\"library\",\"yearsOfExperience\":\"\",\"specialization\":\"\",\"skills\":[\"Library\"]}', '{\"membership\":{\"membershipType\":\"librarian\",\"membershipNumber\":\"TLA2607284\",\"membershipStatus\":\"active\",\"joinDate\":\"2026-01-15T21:00:00.000Z\",\"areasOfInterest\":\"\"},\"payment\":{\"paymentMethod\":\"\",\"accountNumber\":\"\",\"bankName\":\"\",\"cardNumber\":\"\",\"expiryDate\":\"\",\"cvv\":\"\"},\"participation\":{\"previousEvents\":[],\"areasOfInterest\":[],\"volunteerInterest\":false}}', NULL, NULL, '2026-01-21 07:37:58', '2026-01-21 17:19:51'),
(33, 0, NULL, 'fff 12', 'Shinyanga Rural', 'Shinyanga', 'Tanzania', '123', NULL, NULL, NULL, 'Zanzibar University', 'Library Manager', 'Library Manager', NULL, NULL, 'Library MAnagement', 'Master', NULL, 'Zanzibar University', 2018, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2023-02-02', 'male', NULL, NULL, NULL, NULL, 'TLA202631589', NULL, 'active', NULL, '2026-01-27', '{\"fullName\":\"ALI HASSAN ALI\",\"gender\":\"male\",\"dateOfBirth\":\"2023-02-02\",\"nationality\":\"Tanzania\",\"placeOfBirth\":\"\"}', '{\"phone\":\"0643225789\",\"address\":\"fff 12\",\"city\":\"Shinyanga Rural\",\"country\":\"Tanzania\",\"postalCode\":\"123\",\"socialMedia\":{}}', '{\"educationLevel\":\"Master\",\"institutionName\":\"Zanzibar University\",\"yearOfCompletion\":\"2018\",\"skills\":\"Library MAnagement\"}', '{\"occupation\":\"Library Manager\",\"employer\":\"Zanzibar University\",\"workAddress\":\"Tunguu Zanzibar\",\"workPhone\":\"09876654321\",\"workEmail\":\"zanvarsit.ac@com\",\"yearsOfExperience\":\"\"}', NULL, NULL, NULL, '2026-01-27 10:52:27', '2026-01-27 11:26:16'),
(35, 39, '0777412457', 'ffff', 'mwanza', NULL, 'Tanzania', '123', NULL, '/uploads/profile-pictures/5cf4b330-a0e0-45f0-9b76-accdeb574dc7.jpeg', NULL, 'Zanzibar University', 'Library Manager', 'Library Manager', NULL, NULL, 'Library MAnagement', 'Bachelor', NULL, 'Zanzibar University', 2020, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-22', 'male', 'Tanzania', 'Manyara', NULL, NULL, 'TLA202642805', NULL, 'active', NULL, '2026-01-26', '{\"fullName\":\"user1 test one\",\"name\":\"user1 test one\",\"gender\":\"male\",\"date_of_birth\":\"2026-01-22\",\"id_number\":\"\",\"nationality\":\"Tanzania\",\"place_of_birth\":\"Manyara\"}', '{\"email\":\"user1@gmail.com\",\"phone\":\"0777412457\",\"address\":\"ffff\",\"city\":\"mwanza\",\"country\":\"Tanzania\",\"postalCode\":\"123\"}', '[{\"highestDegree\":\"bachelors\",\"institution\":\"Zanzibar University\",\"yearOfGraduation\":\"2023\",\"additionalCertifications\":\"fffff\"}]', '{\"occupation\":\"Library Manager\",\"company\":\"Zanzibar University\",\"industry\":\"library\",\"yearsOfExperience\":\"6-10\",\"specialization\":\"\",\"skills\":[\"Library MAnagement\"]}', '{\"membership\":{\"membershipType\":\"\",\"membershipNumber\":\"TLA202642805\",\"membershipStatus\":\"active\",\"joinDate\":\"2026-01-26T21:00:00.000Z\",\"areasOfInterest\":\"\"},\"payment\":{\"paymentMethod\":\"mobile_money\",\"accountNumber\":\"\",\"bankName\":\"\",\"cardNumber\":\"\",\"expiryDate\":\"\",\"cvv\":\"\",\"mobileProvider\":\"tigopesa\",\"mobileNumber\":\"0712345678\"},\"participation\":{\"previousEvents\":[],\"areasOfInterest\":[],\"volunteerInterest\":false}}', NULL, NULL, '2026-01-27 12:36:39', '2026-01-27 13:37:42'),
(36, 40, '0777412457', NULL, 'Dar es Salaam', NULL, 'Tanzania', NULL, NULL, '/uploads/profile-pictures/2b4ed3f4-263c-48c4-bd9b-401960c5afb4.jpeg', NULL, 'Zanzibar University', 'Library Manager', 'Library Manager', NULL, NULL, 'Library MAnagement', 'Bachelor', NULL, 'Zanzibar University', 2020, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-01', 'female', 'Tanzania', 'Mwanza', NULL, NULL, 'TLA202663286', NULL, 'active', NULL, '2026-01-26', '{\"fullName\":\"user2 test user\",\"name\":\"user2 test user\",\"gender\":\"female\",\"date_of_birth\":\"2026-01-01\",\"id_number\":\"\",\"nationality\":\"Tanzania\",\"place_of_birth\":\"Mwanza\"}', '{\"email\":\"user2@gmail.com\",\"phone\":\"0777412457\",\"address\":\"\",\"city\":\"Dar es Salaam\",\"country\":\"Tanzania\",\"postalCode\":\"\"}', '[{\"highestDegree\":\"\",\"institution\":\"\",\"yearOfGraduation\":\"\",\"additionalCertifications\":\"\"}]', '{\"occupation\":\"Library Manager\",\"company\":\"\",\"industry\":\"\",\"yearsOfExperience\":\"\",\"specialization\":\"\",\"skills\":[\"Library MAnagement\"]}', '{\"membership\":{\"membershipType\":\"\",\"membershipNumber\":\"TLA202663286\",\"membershipStatus\":\"active\",\"joinDate\":\"2026-01-26T21:00:00.000Z\",\"areasOfInterest\":\"\"},\"payment\":{\"paymentMethod\":\"\",\"accountNumber\":\"\",\"bankName\":\"\",\"cardNumber\":\"\",\"expiryDate\":\"\",\"cvv\":\"\"},\"participation\":{\"previousEvents\":[],\"areasOfInterest\":[],\"volunteerInterest\":false}}', NULL, NULL, '2026-01-27 12:49:24', '2026-01-27 13:10:07'),
(37, 41, NULL, 'fff 12', 'Moshi Rural', 'Moshi', 'Tanzania', '123', NULL, NULL, NULL, 'Zanzibar University', 'Library Manager', 'Library Manager', NULL, NULL, 'Library MAnagement', 'Master', NULL, 'Zanzibar University', 2019, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-09', 'male', NULL, NULL, NULL, NULL, 'TLA202533705', NULL, 'active', NULL, '2026-01-27', '{\"fullName\":\"Hassan Said Samatua\",\"gender\":\"male\",\"dateOfBirth\":\"2026-01-09\",\"nationality\":\"Tanzania\",\"placeOfBirth\":\"\"}', '{\"phone\":\"0643225789\",\"address\":\"fff 12\",\"city\":\"Moshi Rural\",\"country\":\"Tanzania\",\"postalCode\":\"123\",\"socialMedia\":{}}', '{\"educationLevel\":\"Master\",\"institutionName\":\"Zanzibar University\",\"yearOfCompletion\":\"2019\",\"skills\":\"Library MAnagement\"}', '{\"occupation\":\"Library Manager\",\"employer\":\"Zanzibar University\",\"workAddress\":\"Tunguu Zanzibar\",\"workPhone\":\"\",\"workEmail\":\"\",\"yearsOfExperience\":\"\"}', NULL, NULL, NULL, '2026-01-27 13:12:39', '2026-01-27 13:13:53'),
(38, 42, '0643225789', 'fff 12', 'Songea Urban', 'Ruvuma', 'Tanzania', '123', NULL, '/uploads/profile-pictures/4ab3a494-f98d-4e5d-8a78-cbe80d49e154.jpeg', NULL, 'Zanzibar University', 'Library Manager', 'Library Manager', NULL, NULL, 'Library MAnagement', 'Bachelor', NULL, 'Zanzibar University', 2020, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1995-02-07', 'male', 'Tanzania', NULL, NULL, NULL, 'TLA202571493', NULL, 'active', NULL, '2026-01-26', '{\"fullName\":\"Hassan Said Samatua\",\"name\":\"Hassan Said Samatua\",\"gender\":\"male\",\"date_of_birth\":\"1995-02-07\",\"id_number\":\"\",\"nationality\":\"Tanzania\",\"place_of_birth\":\"\"}', '{\"email\":\"hanscovd5@gmail.com\",\"phone\":\"0643225789\",\"address\":\"fff 12\",\"city\":\"Songea Urban\",\"country\":\"Tanzania\",\"postalCode\":\"123\"}', '[{\"highestDegree\":\"\",\"institution\":\"\",\"yearOfGraduation\":\"\",\"additionalCertifications\":\"\"}]', '{\"occupation\":\"Library Manager\",\"company\":\"\",\"industry\":\"\",\"yearsOfExperience\":\"\",\"specialization\":\"\",\"skills\":[\"Library MAnagement\"]}', '{\"membership\":{\"membershipType\":\"\",\"membershipNumber\":\"TLA202571493\",\"membershipStatus\":\"active\",\"joinDate\":\"2026-01-26T21:00:00.000Z\",\"areasOfInterest\":\"\"},\"payment\":{\"paymentMethod\":\"\",\"accountNumber\":\"\",\"bankName\":\"\",\"cardNumber\":\"\",\"expiryDate\":\"\",\"cvv\":\"\"},\"participation\":{\"previousEvents\":[],\"areasOfInterest\":[],\"volunteerInterest\":false}}', NULL, NULL, '2026-01-27 14:04:45', '2026-01-27 14:41:22');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `contact_submissions`
--
ALTER TABLE `contact_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_email` (`email`(191)),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `event_payments`
--
ALTER TABLE `event_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_registration_id` (`registration_id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `event_payments_azampay`
--
ALTER TABLE `event_payments_azampay`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `azampay_reference` (`azampay_reference`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD KEY `idx_event_user` (`event_id`,`user_id`),
  ADD KEY `idx_reference` (`azampay_reference`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `event_payment_callbacks`
--
ALTER TABLE `event_payment_callbacks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_processed` (`processed`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `payment_notifications`
--
ALTER TABLE `payment_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_registration_id` (`registration_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_notification_type` (`notification_type`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_membership_number` (`membership_number`),
  ADD KEY `idx_is_approved` (`is_approved`);

--
-- Indexes for table `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_id` (`user_id`),
  ADD KEY `idx_membership_number` (`membership_number`),
  ADD KEY `idx_membership_status` (`membership_status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `contact_submissions`
--
ALTER TABLE `contact_submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `event_payments`
--
ALTER TABLE `event_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `event_payments_azampay`
--
ALTER TABLE `event_payments_azampay`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `event_payment_callbacks`
--
ALTER TABLE `event_payment_callbacks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `payment_notifications`
--
ALTER TABLE `payment_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `user_profiles`
--
ALTER TABLE `user_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
