DROP TABLE Flows;
DROP TABLE Pipelines;
DROP TABLE Systems;
DROP VIEW SourceToTargetView;

CREATE TABLE Systems (
    ID INT NOT NULL IDENTITY PRIMARY KEY,
    SystemCode varchar(5) not null,
    SystemName varchar(100) not null,
    Description varchar(200),
    Status varchar(10) not null,
    UpdateAt datetime
)
GO

CREATE TABLE Pipelines (
    ID INT NOT NULL IDENTITY PRIMARY KEY,
    SystemID INT NOT NULL,
    PipelineName varchar(100) not null,
    Description varchar(200),
    Status varchar(10) not null,
    UpdateAt datetime
)
GO

ALTER TABLE Pipelines
ADD Constraint Pipelines_FK1 Foreign Key (SystemID)
REFERENCES Systems(ID)
GO

CREATE TABLE Flows (
    ID INT NOT NULL IDENTITY PRIMARY KEY,
    PipelineID INT NOT NULL,
    FlowName varchar(100) not null,
    Description varchar(200),
    NotebookName varchar(100) not null,
    SourceStorageAccount varchar(200),
    SourceContainer varchar(200),
    SourcePath varchar(800),
    SourceFileType varchar(100),
    TargetStorageAccount varchar(200),
    TargetContainer varchar(200),
    TargetPath varchar(800),
    TargetFileType varchar(100),
    SinkOperation varchar(100),
    PrimaryKey varchar(100),
    BusinessKey varchar(100),
    Status varchar(10) not null,
    UpdateAt datetime
)
GO

ALTER TABLE Flows
ADD Constraint Flows_FK1 Foreign Key (PipelineID)
REFERENCES Pipelines(ID)
GO

CREATE VIEW dbo.SourceToTargetView
AS
SELECT  
    a.ID as 'SourceToTargetID',
    a.SystemCode as 'SourceSystemCode',
    a.SystemName as 'SourceSystemName',
    b.ID as 'PipelineID',
    b.PipelineName as 'PipelineName',
    b.Description as 'PipelineDescription',
    c.ID as 'FlowID',
    c.FlowName as 'FlowName',
    c.Description as 'FlowDescription',
    c.NotebookName as 'NotebookName',
    c.SourceStorageAccount as 'SourceStorageAccount',
    c.SourceContainer as 'SourceContainer',
    c.SourcePath as 'SourcePath',
    c.SourceFileType as 'SourceFileType',
    c.TargetStorageAccount as 'TargetStorageAccount',
    c.TargetContainer as 'TargetContainer',
    c.TargetPath as 'TargetPath',
    c.TargetFileType as 'TargetFileType',
    c.SinkOperation as 'SinkOperation',
    c.PrimaryKey as 'PrimaryKey', 
    c.BusinessKey as 'BusinessKey'
FROM Systems a
INNER JOIN Pipelines b
 ON a.ID = b.SystemID
INNER JOIN Flows c
 ON b.ID = c.PipelineID
GO

INSERT INTO [dbo].[Systems](
    SystemCode,
    SystemName,
    Description,
    Status,
    UpdateAt
)VALUES(
    'AW',
    'AdventureWorks',
    'AdventureWorks sample database',
    'Active',
     GETDATE()
)
GO

INSERT INTO [dbo].[Pipelines](
    SystemID,
    PipelineName,
    Description,
    Status,
    UpdateAt
)VALUES(
    1,
    'BronseToSilver',
    'Transform CSVs to Delta files',
    'Active',
     GETDATE()
)
GO

INSERT INTO [dbo].[Flows](
    PipelineID,
    FlowName,
    Description,
    NotebookName,
    SourceStorageAccount,
    SourceContainer,
    SourcePath,
    SourceFileType,
    TargetStorageAccount,
    TargetContainer,
    TargetPath,
    TargetFileType,
    SinkOperation,
    PrimaryKey,
    BusinessKey,
    Status,
    UpdateAt
)VALUES(
    1,
    'SalesLTAddress',
    'Transform SalesLTAddress',
    'DataProcessing',
    'synapsepiethein',
    'synapsedata',
    '/landingzone/AdventureWorks/',
    'CSV',
    'synapsepiethein',
    'synapsedata',
    '/processedzone/AdventureWorks',
    'DELTA',
    'Merge',
    'AddressID',
    'AddressID',
    'Active',
     GETDATE()
)
GO

CREATE TABLE PipelineLog(
    PipelineID varchar(100) null,
    Stage varchar(50) null,
    RunId varchar(100) null,
    Status varchar(100) null,
    ErrorMessage varchar(300) null,
    StartTime datetime null,
    EndTime datetime null,
    DurationInSeconds int,
    UpdatedAt datetime null
)
GO

CREATE PROC InsertPipelineLog(
    @PipelineID varchar(100),
    @Stage varchar(50),
    @RunID varchar(100),
    @Status varchar(100),
    @ErrorMessage varchar(100),
    @StartTime datetime null,
    @EndTime datetime null,
    @DurationInSeconds int,
    @UpdatedAt DateTime
)
AS
INSERT INTO dbo.PipelineLog(PipelineID, Stage, RunId, Status, ErrorMessage, StartTime, EndTime, DurationInSeconds, UpdatedAt)
VALUES (@PipelineID, @Stage, @RunID, @Status, @ErrorMessage, @StartTime, @EndTime, @DurationInSeconds, @UpdatedAt)
GO