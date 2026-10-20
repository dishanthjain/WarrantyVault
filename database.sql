CREATE DATABASE IF NOT EXISTS warrantyvault;
USE warrantyvault;

CREATE TABLE Users (
    User_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    Phone VARCHAR(20)
);

CREATE TABLE Products (
    Product_ID INT AUTO_INCREMENT PRIMARY KEY,
    User_ID INT NOT NULL,
    PName VARCHAR(120) NOT NULL,
    Brand VARCHAR(80) NOT NULL,
    Model VARCHAR(80),
    SNumber VARCHAR(120) NOT NULL UNIQUE,
    FOREIGN KEY (User_ID) REFERENCES Users(User_ID)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Purchases (
    P_ID INT AUTO_INCREMENT PRIMARY KEY,
    PR_ID INT NOT NULL,
    T_No VARCHAR(100),
    Price DECIMAL(10,2) NOT NULL DEFAULT 0,
    Date DATE NOT NULL,
    FOREIGN KEY (PR_ID) REFERENCES Products(Product_ID)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Warranties (
    W_ID INT AUTO_INCREMENT PRIMARY KEY,
    Product_ID INT NOT NULL UNIQUE,
    SDate DATE NOT NULL,
    EDate DATE NOT NULL,
    Status ENUM('Active', 'Expired', 'Claimed', 'Voided')
        NOT NULL DEFAULT 'Active',
    Coverage TEXT,
    FOREIGN KEY (Product_ID) REFERENCES Products(Product_ID)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE Repairs (
    R_ID INT AUTO_INCREMENT PRIMARY KEY,
    Product_ID INT NOT NULL,
    Date DATE NOT NULL,
    Issue TEXT NOT NULL,
    Cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    Service VARCHAR(150),
    Status ENUM('Requested', 'In Progress', 'Completed', 'Cancelled')
        NOT NULL DEFAULT 'Requested',
    FOREIGN KEY (Product_ID) REFERENCES Products(Product_ID)
        ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO Users (Name, Email, Phone)
VALUES ('Demo User', 'demo@warrantyvault.local', '0000000000');