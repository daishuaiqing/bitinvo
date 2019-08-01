-- MySQL dump 10.13  Distrib 5.7.18, for macos10.12 (x86_64)
--
-- Host: localhost    Database: bitinvo
-- ------------------------------------------------------
-- Server version	5.7.18

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `application`
--

DROP TABLE IF EXISTS `application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `application` (
  `detail` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `remote` tinyint(1) DEFAULT NULL,
  `remoteStatus` varchar(255) DEFAULT NULL,
  `processList` longtext,
  `start` datetime DEFAULT NULL,
  `end` datetime DEFAULT NULL,
  `applicant` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `flatType` varchar(255) DEFAULT NULL,
  `bulletAppType` varchar(255) DEFAULT NULL,
  `gun` longtext DEFAULT NULL,
  `bulletType` varchar(255) DEFAULT NULL,
  `num` int(11) DEFAULT NULL,
  `actualGun` longtext DEFAULT NULL,
  `actualBulletType` varchar(255) DEFAULT NULL,
  `actualNum` int(11) DEFAULT NULL,
  `cabinetModule` longtext DEFAULT NULL,
  `cabinet` varchar(255) DEFAULT NULL,
  `org` varchar(255) DEFAULT NULL,
  `firstAuthAdmin` varchar(255) DEFAULT NULL,
  `secondAuthAdmin` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application`
--

LOCK TABLES `application` WRITE;
/*!40000 ALTER TABLE `application` DISABLE KEYS */;
/*!40000 ALTER TABLE `application` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `application_assets__asset_assets_asset`
--

DROP TABLE IF EXISTS `application_assets__asset_assets_asset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `application_assets__asset_assets_asset` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `application_assets` varchar(255) DEFAULT NULL,
  `asset_assets_asset` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application_assets__asset_assets_asset`
--

LOCK TABLES `application_assets__asset_assets_asset` WRITE;
/*!40000 ALTER TABLE `application_assets__asset_assets_asset` DISABLE KEYS */;
/*!40000 ALTER TABLE `application_assets__asset_assets_asset` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applicationcaptured`
--

DROP TABLE IF EXISTS `applicationcaptured`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `applicationcaptured` (
  `applicationId` varchar(255) DEFAULT NULL,
  `assetId` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applicationcaptured`
--

LOCK TABLES `applicationcaptured` WRITE;
/*!40000 ALTER TABLE `applicationcaptured` DISABLE KEYS */;
/*!40000 ALTER TABLE `applicationcaptured` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applicationprocess`
--

DROP TABLE IF EXISTS `applicationprocess`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `applicationprocess` (
  `detail` varchar(255) DEFAULT NULL,
  `applicant` varchar(255) DEFAULT NULL,
  `approver` varchar(255) DEFAULT NULL,
  `application` varchar(255) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `org` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applicationprocess`
--

LOCK TABLES `applicationprocess` WRITE;
/*!40000 ALTER TABLE `applicationprocess` DISABLE KEYS */;
/*!40000 ALTER TABLE `applicationprocess` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applicationtype`
--

DROP TABLE IF EXISTS `applicationtype`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `applicationtype` (
  `name` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `approverOption` varchar(255) DEFAULT NULL,
  `voteType` varchar(255) DEFAULT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `remote` tinyint(1) DEFAULT NULL,
  `noAdminConfirm` tinyint(1) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  UNIQUE KEY `name` (`name`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applicationtype`
--

LOCK TABLES `applicationtype` WRITE;
/*!40000 ALTER TABLE `applicationtype` DISABLE KEYS */;
INSERT INTO `applicationtype` VALUES ('取枪','gun','single','affirmative',NULL,0,0,'22f6708d-f07b-4dae-956b-f79207e82c99',1,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('取子弹','bullet','single','affirmative',NULL,0,0,'391e01d4-45aa-4b84-9d1a-2a0b61eacd88',2,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('存枪','storageGun','single','affirmative',NULL,0,0,'44a760de-b2a4-4635-8769-49e1ba624a08',3,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('存子弹','storageBullet','single','affirmative',NULL,0,0,'565685ef-6b76-40b5-9941-1d616eba354c',4,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('紧急开启','emergency','single','affirmative',NULL,0,0,'fd2d61a8-7db1-42c5-8cdc-bfe913150101',5,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43');
/*!40000 ALTER TABLE `applicationtype` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applicationtype_approvers__user_approvers_user`
--

DROP TABLE IF EXISTS `applicationtype_approvers__user_approvers_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `applicationtype_approvers__user_approvers_user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `applicationtype_approvers` varchar(255) DEFAULT NULL,
  `user_approvers_user` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applicationtype_approvers__user_approvers_user`
--

LOCK TABLES `applicationtype_approvers__user_approvers_user` WRITE;
/*!40000 ALTER TABLE `applicationtype_approvers__user_approvers_user` DISABLE KEYS */;
/*!40000 ALTER TABLE `applicationtype_approvers__user_approvers_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset`
--

DROP TABLE IF EXISTS `asset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset` (
  `name` varchar(255) DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `md5` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset`
--

LOCK TABLES `asset` WRITE;
/*!40000 ALTER TABLE `asset` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset_assets_asset__optlog_assets`
--

DROP TABLE IF EXISTS `asset_assets_asset__optlog_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset_assets_asset__optlog_assets` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `optlog_assets` varchar(255) DEFAULT NULL,
  `asset_assets_asset` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_assets_asset__optlog_assets`
--

LOCK TABLES `asset_assets_asset__optlog_assets` WRITE;
/*!40000 ALTER TABLE `asset_assets_asset__optlog_assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset_assets_asset__optlog_assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bullettype`
--

DROP TABLE IF EXISTS `bullettype`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bullettype` (
  `name` varchar(255) DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bullettype`
--

LOCK TABLES `bullettype` WRITE;
/*!40000 ALTER TABLE `bullettype` DISABLE KEYS */;
INSERT INTO `bullettype` VALUES ('54式子弹','1','0f5c0778-f99b-4f16-a424-75559f0dfa37',1,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('64式子弹','2','2ced6b87-52bb-4dbe-95b6-5a06c957dfc8',2,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('77式子弹','3','30d90afc-90c9-48a5-ba5c-f66b26617718',3,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('92式子弹','4','6ec31d88-7d03-4ce1-a485-beb13fba2ef9',4,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('05式子弹','5','70a3127d-9ff5-4c93-9b9e-f21d3b2a25ce',5,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('85式子弹','6','9054a2e2-6a91-4669-addb-b18ecf54a047',6,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('88式子弹','7','b9460b77-7cc3-4c9c-85d8-97f5299fea07',7,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('92式1子弹','8','c7bb903b-0f72-4743-b15b-98b79110cf46',8,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('97式防爆枪子弹','9','d08f0795-b4f1-4e21-ad6b-219d0f48eb1e',9,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('79式子弹','10','e7d6b75f-8c32-4c70-ac42-5770ceae2028',10,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43');
/*!40000 ALTER TABLE `bullettype` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cabinet`
--

DROP TABLE IF EXISTS `cabinet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cabinet` (
  `name` varchar(255) DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `etcdCode` varchar(255) DEFAULT NULL,
  `identification` varchar(255) DEFAULT NULL,
  `host` varchar(255) DEFAULT NULL,
  `port` int(11) DEFAULT NULL,
  `info` longtext,
  `org` varchar(255) DEFAULT NULL,
  `remoteToken` varchar(255) DEFAULT NULL,
  `tokenExpire` datetime DEFAULT NULL,
  `clusterId` varchar(255) DEFAULT NULL,
  `isMaster` tinyint(1) DEFAULT NULL,
  `isAlive` tinyint(1) DEFAULT NULL,
  `isVerified` tinyint(1) DEFAULT NULL,
  `isLocal` tinyint(1) DEFAULT NULL,
  `isBlock` tinyint(1) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `camIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cabinet`
--

LOCK TABLES `cabinet` WRITE;
/*!40000 ALTER TABLE `cabinet` DISABLE KEYS */;
/*!40000 ALTER TABLE `cabinet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cabinetmodule`
--

DROP TABLE IF EXISTS `cabinetmodule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cabinetmodule` (
  `type` varchar(255) DEFAULT NULL,
  `capacity` int(11) DEFAULT NULL,
  `load` int(11) DEFAULT NULL,
  `cabinet` varchar(255) DEFAULT NULL,
  `lockState` int(11) DEFAULT NULL,
  `gunState` int(11) DEFAULT NULL,
  `gunLock` varchar(255) DEFAULT NULL,
  `gun` varchar(255) DEFAULT NULL,
  `gunType` varchar(255) DEFAULT NULL,
  `bulletType` varchar(255) DEFAULT NULL,
  `moduleId` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `canId` int(11) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cabinetmodule`
--

LOCK TABLES `cabinetmodule` WRITE;
/*!40000 ALTER TABLE `cabinetmodule` DISABLE KEYS */;
/*!40000 ALTER TABLE `cabinetmodule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cert`
--

DROP TABLE IF EXISTS `cert`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cert` (
  `code` varchar(255) DEFAULT NULL,
  `gun` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `gun` (`gun`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cert`
--

LOCK TABLES `cert` WRITE;
/*!40000 ALTER TABLE `cert` DISABLE KEYS */;
/*!40000 ALTER TABLE `cert` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact`
--

DROP TABLE IF EXISTS `contact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contact` (
  `user` varchar(255) DEFAULT NULL,
  `desc` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact`
--

LOCK TABLES `contact` WRITE;
/*!40000 ALTER TABLE `contact` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_contacts_contact__contactgroup_contacts`
--

DROP TABLE IF EXISTS `contact_contacts_contact__contactgroup_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contact_contacts_contact__contactgroup_contacts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `contactgroup_contacts` varchar(255) DEFAULT NULL,
  `contact_contacts_contact` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_contacts_contact__contactgroup_contacts`
--

LOCK TABLES `contact_contacts_contact__contactgroup_contacts` WRITE;
/*!40000 ALTER TABLE `contact_contacts_contact__contactgroup_contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_contacts_contact__contactgroup_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contactgroup`
--

DROP TABLE IF EXISTS `contactgroup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contactgroup` (
  `name` varchar(255) DEFAULT NULL,
  `owner` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contactgroup`
--

LOCK TABLES `contactgroup` WRITE;
/*!40000 ALTER TABLE `contactgroup` DISABLE KEYS */;
/*!40000 ALTER TABLE `contactgroup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doorstate`
--

DROP TABLE IF EXISTS `doorstate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `doorstate` (
  `DoorId` varchar(255) DEFAULT NULL,
  `DoorState` int(11) DEFAULT NULL,
  `DoorHandState` int(11) DEFAULT NULL,
  `DoorMotorState` int(11) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doorstate`
--

LOCK TABLES `doorstate` WRITE;
/*!40000 ALTER TABLE `doorstate` DISABLE KEYS */;
/*!40000 ALTER TABLE `doorstate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dutyshift`
--

DROP TABLE IF EXISTS `dutyshift`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dutyshift` (
  `start` datetime DEFAULT NULL,
  `end` datetime DEFAULT NULL,
  `user` varchar(255) DEFAULT NULL,
  `org` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dutyshift`
--

LOCK TABLES `dutyshift` WRITE;
/*!40000 ALTER TABLE `dutyshift` DISABLE KEYS */;
/*!40000 ALTER TABLE `dutyshift` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `face`
--

DROP TABLE IF EXISTS `face`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `face` (
  `data` blob,
  `owner` varchar(255) DEFAULT NULL,
  `used` int(11) DEFAULT NULL,
  `version` int(11) DEFAULT NULL,
  `chksum` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `face`
--

LOCK TABLES `face` WRITE;
/*!40000 ALTER TABLE `face` DISABLE KEYS */;
/*!40000 ALTER TABLE `face` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fingerprint`
--

DROP TABLE IF EXISTS `fingerprint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fingerprint` (
  `data` blob,
  `owner` varchar(255) DEFAULT NULL,
  `used` int(11) DEFAULT NULL,
  `version` int(11) DEFAULT NULL,
  `chksum` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fingerprint`
--

LOCK TABLES `fingerprint` WRITE;
/*!40000 ALTER TABLE `fingerprint` DISABLE KEYS */;
/*!40000 ALTER TABLE `fingerprint` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fingerprint_archive`
--

DROP TABLE IF EXISTS `fingerprint_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fingerprint_archive` (
  `localId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(255) DEFAULT NULL,
  `data` blob,
  `owner` varchar(255) DEFAULT NULL,
  `used` int(11) DEFAULT NULL,
  `version` int(11) DEFAULT NULL,
  `chksum` varchar(255) DEFAULT NULL,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fingerprint_archive`
--

LOCK TABLES `fingerprint_archive` WRITE;
/*!40000 ALTER TABLE `fingerprint_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `fingerprint_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gun`
--

DROP TABLE IF EXISTS `gun`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gun` (
  `name` varchar(255) DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `associatedGun` varchar(255) DEFAULT NULL,
  `associatedBulletModule` varchar(255) DEFAULT NULL,
  `isPublic` tinyint(1) DEFAULT NULL,
  `isDisabled` tinyint(1) DEFAULT NULL,
  `user` varchar(255) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `cert` varchar(255) DEFAULT NULL,
  `lastMaintainDate` date DEFAULT NULL,
  `maintainInterval` int(11) DEFAULT NULL,
  `storageStatus` varchar(255) DEFAULT NULL,
  `gunStatus` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gun`
--

LOCK TABLES `gun` WRITE;
/*!40000 ALTER TABLE `gun` DISABLE KEYS */;
/*!40000 ALTER TABLE `gun` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `guntype`
--

DROP TABLE IF EXISTS `guntype`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `guntype` (
  `name` varchar(255) DEFAULT NULL,
  `bulletType` varchar(255) DEFAULT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guntype`
--

LOCK TABLES `guntype` WRITE;
/*!40000 ALTER TABLE `guntype` DISABLE KEYS */;
INSERT INTO `guntype` VALUES ('54式','0f5c0778-f99b-4f16-a424-75559f0dfa37','短枪','23879cef-b3c7-4057-9ff5-f3b84fb63dc7',1,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('64式','2ced6b87-52bb-4dbe-95b6-5a06c957dfc8','短枪','4a6c5da3-fd36-4dfa-8ed1-57e9398d1e8a',2,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('77式','30d90afc-90c9-48a5-ba5c-f66b26617718','短枪','52b7e3f9-1b75-4a14-87a7-5ccdab06b82f',3,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('92式','6ec31d88-7d03-4ce1-a485-beb13fba2ef9','短枪','66fc900b-0948-4670-a5ba-7df8942c3cbd',4,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('05式','70a3127d-9ff5-4c93-9b9e-f21d3b2a25ce','短枪','7d77972f-82f7-4448-83c5-17ead54efd11',5,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('85式','9054a2e2-6a91-4669-addb-b18ecf54a047','长枪','8a431d56-e135-4b85-b619-fe7f032a867a',6,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('88式','b9460b77-7cc3-4c9c-85d8-97f5299fea07','长枪','8a8f58a0-9720-49ae-8b28-e8ccb8b4fb49',7,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('92式1','c7bb903b-0f72-4743-b15b-98b79110cf46','长枪','9412e06a-e22d-4f2d-bb0b-9b15f8237167',8,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('97式防爆枪','d08f0795-b4f1-4e21-ad6b-219d0f48eb1e','长枪','ac150de4-251b-4f62-a28c-54ffbf198210',9,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('79式','e7d6b75f-8c32-4c70-ac42-5770ceae2028','长枪','fbc5b3c7-0cae-4ad6-b978-ba4f9e96f6dc',10,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43');
/*!40000 ALTER TABLE `guntype` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintain`
--

DROP TABLE IF EXISTS `maintain`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `maintain` (
  `cabinet` varchar(255) DEFAULT NULL,
  `application` varchar(255) DEFAULT NULL,
  `count` int(11) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintain`
--

LOCK TABLES `maintain` WRITE;
/*!40000 ALTER TABLE `maintain` DISABLE KEYS */;
/*!40000 ALTER TABLE `maintain` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message`
--

DROP TABLE IF EXISTS `message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message` (
  `from` varchar(255) DEFAULT NULL,
  `to` varchar(255) DEFAULT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `isRead` tinyint(1) DEFAULT NULL,
  `refModel` varchar(255) DEFAULT NULL,
  `refId` int(11) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message`
--

LOCK TABLES `message` WRITE;
/*!40000 ALTER TABLE `message` DISABLE KEYS */;
/*!40000 ALTER TABLE `message` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mqtt`
--

DROP TABLE IF EXISTS `mqtt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mqtt` (
  `orgId` varchar(255) DEFAULT NULL,
  `orgName` varchar(255) DEFAULT NULL,
  `gunCount` varchar(255) DEFAULT NULL,
  `bulletCount` varchar(255) DEFAULT NULL,
  `online` tinyint(1) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mqtt`
--

LOCK TABLES `mqtt` WRITE;
/*!40000 ALTER TABLE `mqtt` DISABLE KEYS */;
/*!40000 ALTER TABLE `mqtt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `optlog`
--

DROP TABLE IF EXISTS `optlog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `optlog` (
  `object` varchar(255) DEFAULT NULL,
  `objectId` varchar(255) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `actionType` varchar(255) DEFAULT NULL,
  `logData` longtext,
  `log` varchar(255) DEFAULT NULL,
  `logType` varchar(255) DEFAULT NULL,
  `gunAction` varchar(255) DEFAULT NULL,
  `applicationId` varchar(255) DEFAULT NULL,
  `facePic` varchar(255) DEFAULT NULL,
  `fingerPrint` varchar(255) DEFAULT NULL,
  `cabinet` varchar(255) DEFAULT NULL,
  `org` varchar(255) DEFAULT NULL,
  `signature` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `optlog`
--

LOCK TABLES `optlog` WRITE;
/*!40000 ALTER TABLE `optlog` DISABLE KEYS */;
/*!40000 ALTER TABLE `optlog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `org`
--

DROP TABLE IF EXISTS `org`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `org` (
  `name` varchar(255) DEFAULT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `locLat` varchar(255) DEFAULT NULL,
  `locLng` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `superior` varchar(255) DEFAULT NULL,
  `isLocal` tinyint(1) DEFAULT NULL,
  `host` varchar(255) DEFAULT NULL,
  `port` varchar(255) DEFAULT NULL,
  `historyUrl` varchar(255) DEFAULT NULL,
  `isVerified` tinyint(1) DEFAULT NULL,
  `remoteToken` varchar(255) DEFAULT NULL,
  `webcamUrl` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  UNIQUE KEY `name` (`name`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `org`
--

LOCK TABLES `org` WRITE;
/*!40000 ALTER TABLE `org` DISABLE KEYS */;
/*!40000 ALTER TABLE `org` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `passport`
--

DROP TABLE IF EXISTS `passport`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `passport` (
  `protocol` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `identifier` varchar(255) DEFAULT NULL,
  `tokens` longtext,
  `user` varchar(255) DEFAULT NULL,
  `filter` tinyint(1) DEFAULT NULL,
  `needReset` tinyint(1) DEFAULT NULL,
  `version` int(11) DEFAULT NULL,
  `chksum` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `passport`
--

LOCK TABLES `passport` WRITE;
/*!40000 ALTER TABLE `passport` DISABLE KEYS */;
INSERT INTO `passport` VALUES ('local','$2a$08$WdbEx0fnjqs5k6IHESiNJOSY69X1C3YoPeatz4DF5GJAW5TsSfbmu',NULL,NULL,NULL,'845da56c-c678-4d1f-ae98-f0e8e99dbbe7',1,1,1,NULL,'1bea280e-95e7-4019-b0e0-828251119716',1,0,NULL,'845da56c-c678-4d1f-ae98-f0e8e99dbbe7','845da56c-c678-4d1f-ae98-f0e8e99dbbe7',NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('local','$2a$08$WOdMSg5Ttv62co1pCvZmEe.T.HMBW2oqndlFwrkEeDB6yY/sT2dP2',NULL,NULL,NULL,'82cefb70-56ab-43da-8d84-fb5938980bcf',1,1,1,'614d7872d7ce2af4c430862e29fe5281','21aef40d-f2fe-4d87-9e8b-78c2f0a25572',2,0,NULL,'82cefb70-56ab-43da-8d84-fb5938980bcf','82cefb70-56ab-43da-8d84-fb5938980bcf',NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43');
/*!40000 ALTER TABLE `passport` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `passport_archive`
--

DROP TABLE IF EXISTS `passport_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `passport_archive` (
  `localId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(255) DEFAULT NULL,
  `protocol` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `identifier` varchar(255) DEFAULT NULL,
  `tokens` longtext,
  `user` varchar(255) DEFAULT NULL,
  `needReset` tinyint(1) DEFAULT NULL,
  `version` int(11) DEFAULT NULL,
  `chksum` varchar(255) DEFAULT NULL,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `passport_archive`
--

LOCK TABLES `passport_archive` WRITE;
/*!40000 ALTER TABLE `passport_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `passport_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `position`
--

DROP TABLE IF EXISTS `position`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `position` (
  `name` varchar(255) DEFAULT NULL,
  `superior` varchar(255) DEFAULT NULL,
  `level` int(11) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  UNIQUE KEY `name` (`name`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `position`
--

LOCK TABLES `position` WRITE;
/*!40000 ALTER TABLE `position` DISABLE KEYS */;
INSERT INTO `position` VALUES ('警员',NULL,NULL,'5b558389-9c19-48e5-a3ee-fbcee77b6d15',1,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43');
/*!40000 ALTER TABLE `position` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role` (
  `name` varchar(255) DEFAULT NULL,
  `permissions` longtext,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  UNIQUE KEY `name` (`name`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role`
--

LOCK TABLES `role` WRITE;
/*!40000 ALTER TABLE `role` DISABLE KEYS */;
INSERT INTO `role` VALUES ('管理员','[\"view-app\",\"manage-cabinet\"]','acbdd657-af59-4f0c-9d32-ab9794a877b1',1,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('申请授权人','[\"view-app\"]','b8fe9b06-98ca-465f-8b75-22f54bbbfb52',2,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('柜机管理员','[\"manage-cabinet\"]','ccc26416-3a53-4132-be5c-9e2d0eecd737',3,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('超级管理员','[\"view-app\",\"manage-cabinet\",\"manage-system\"]','cdbdd657-bf59-4f3c-213a-a39194a877b1',4,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('用户','[]','efe43deb-1d44-4d36-8575-dc71f6171c9d',5,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43');
/*!40000 ALTER TABLE `role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_roles_role__user_roles`
--

DROP TABLE IF EXISTS `role_roles_role__user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_roles_role__user_roles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_roles` varchar(255) DEFAULT NULL,
  `role_roles_role` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_roles_role__user_roles`
--

LOCK TABLES `role_roles_role__user_roles` WRITE;
/*!40000 ALTER TABLE `role_roles_role__user_roles` DISABLE KEYS */;
INSERT INTO `role_roles_role__user_roles` VALUES (1,'845da56c-c678-4d1f-ae98-f0e8e99dbbe7','acbdd657-af59-4f0c-9d32-ab9794a877b1'),(2,'82cefb70-56ab-43da-8d84-fb5938980bcf','cdbdd657-bf59-4f3c-213a-a39194a877b1');
/*!40000 ALTER TABLE `role_roles_role__user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_users__user_users_user`
--

DROP TABLE IF EXISTS `role_users__user_users_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_users__user_users_user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `role_users` varchar(255) DEFAULT NULL,
  `user_users_user` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_users__user_users_user`
--

LOCK TABLES `role_users__user_users_user` WRITE;
/*!40000 ALTER TABLE `role_users__user_users_user` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_users__user_users_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `signature`
--

DROP TABLE IF EXISTS `signature`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `signature` (
  `signature` longtext,
  `user` varchar(255) DEFAULT NULL,
  `application` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `signature`
--

LOCK TABLES `signature` WRITE;
/*!40000 ALTER TABLE `signature` DISABLE KEYS */;
/*!40000 ALTER TABLE `signature` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `system`
--

DROP TABLE IF EXISTS `system`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system` (
  `key` varchar(255) DEFAULT NULL,
  `value` longtext DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system`
--

LOCK TABLES `system` WRITE;
/*!40000 ALTER TABLE `system` DISABLE KEYS */;
/*!40000 ALTER TABLE `system` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `username` varchar(255) DEFAULT NULL,
  `identityNumber` varchar(255) DEFAULT NULL,
  `alias` varchar(255) DEFAULT NULL,
  `aliasSpell` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `sex` varchar(255) DEFAULT NULL,
  `superior` varchar(255) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `details` varchar(255) DEFAULT NULL,
  `isDummy` tinyint(1) DEFAULT NULL,
  `isLocal` tinyint(1) DEFAULT NULL,
  `disablePasswdLogin` varchar(255) DEFAULT NULL,
  `device` varchar(255) DEFAULT NULL,
  `info` longtext,
  `position` varchar(255) DEFAULT NULL,
  `activeConnections` longtext,
  `token` varchar(255) DEFAULT NULL,
  `org` varchar(255) DEFAULT NULL,
  `isBlock` tinyint(1) DEFAULT NULL,
  `version` int(11) DEFAULT NULL,
  `chksum` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `localId` (`localId`),
  UNIQUE KEY `username` (`username`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('8888',NULL,'8888',NULL,NULL,NULL,'M',NULL,NULL,NULL,'active',NULL,0,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,1,NULL,'82cefb70-56ab-43da-8d84-fb5938980bcf',1,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43'),('0001',NULL,'0001',NULL,NULL,NULL,'M',NULL,NULL,NULL,'active',NULL,0,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,1,NULL,'845da56c-c678-4d1f-ae98-f0e8e99dbbe7',2,0,NULL,NULL,NULL,NULL,NULL,'2017-07-21 10:31:43','2017-07-21 10:31:43');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_archive`
--

DROP TABLE IF EXISTS `user_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_archive` (
  `localId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(255) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `identityNumber` varchar(255) DEFAULT NULL,
  `alias` varchar(255) DEFAULT NULL,
  `aliasSpell` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `sex` varchar(255) DEFAULT NULL,
  `superior` varchar(255) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `details` varchar(255) DEFAULT NULL,
  `isDummy` tinyint(1) DEFAULT NULL,
  `device` varchar(255) DEFAULT NULL,
  `info` longtext,
  `position` varchar(255) DEFAULT NULL,
  `activeConnections` longtext,
  `passports` varchar(255) DEFAULT NULL,
  `guns` varchar(255) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `org` varchar(255) DEFAULT NULL,
  `isBlock` tinyint(1) DEFAULT NULL,
  `version` int(11) DEFAULT NULL,
  `chksum` varchar(255) DEFAULT NULL,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`localId`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_archive`
--

LOCK TABLES `user_archive` WRITE;
/*!40000 ALTER TABLE `user_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `iris`
--

DROP TABLE IF EXISTS `iris`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `iris` (
  `data` blob,
  `owner` varchar(255) DEFAULT NULL,
  `used` int(11) DEFAULT NULL,
  `version` int(11) DEFAULT NULL,
  `chksum` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `localId` int(11) DEFAULT NULL,
  `isDeleted` tinyint(1) DEFAULT NULL,
  `userIp` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `SyncFrom` varchar(255) DEFAULT NULL,
  `UpdatedFrom` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `createdBy` (`createdBy`),
  KEY `updatedBy` (`updatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-07-21 10:33:12
