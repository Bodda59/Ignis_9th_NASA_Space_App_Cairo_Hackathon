ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'Other Sources';

-- Older imports retained filenames, but not their original directories.
UPDATE rag_documents
SET source_type = CASE
    WHEN file_name ~* '^(i_investigation|s_psi-[0-9]+)[.]txt$' THEN 'Investigation Metadata Files'
    WHEN file_name ~* '^psi-[0-9]+_experimental tables?_' THEN 'Experimental table'
    WHEN file_name ~* '^psi-[0-9]+_reports?_' THEN 'Reports'
    WHEN file_name ~* '^psi-[0-9]+_science documents_' THEN 'Science Documents'
    WHEN file_name ~* '^psi-[0-9]+_engineering documents_' THEN 'Engineering Documents'
    WHEN file_name ~* '^psi-[0-9]+_presentations_' THEN 'Presentations'
    WHEN file_name ~* '^psi-[0-9]+_analyzed data_' THEN 'Analyzed Data'
    WHEN file_name ~* '^psi-[0-9]+_reference data_' THEN 'Reference Data'
    WHEN file_name ~* '^psi-[0-9]+_calibration_' THEN 'Calibration'
    WHEN file_name ~* '^psi-[0-9]+_raw data_' THEN 'Raw Data'
    WHEN file_name ~* '[.]csv$' THEN 'Experimental table'
    ELSE 'Other Sources'
END
WHERE source_type = 'Other Sources';

-- Source folders and identifiable legacy titles for documents imported before categorization.
UPDATE rag_documents AS d
SET source_type = verified.source_type
FROM (VALUES
    ('PSI-100', 'NTRS 20180004258 - Saffire I-III Results Overview.pdf', 'Reports'),
    ('PSI-100', 'SAFFIRE Objectives, Development and Status.txt', 'Science Documents'),
    ('PSI-100', 'SAFFIRE-I and SAFFIRE-III Readme.txt', 'Science Documents'),
    ('PSI-100', 'SAFFIRE-III Operations.txt', 'Engineering Documents'),
    ('PSI-101', 'SAME EIRD Rev 2.00 02-25-05 HIgh Q.txt', 'Engineering Documents'),
    ('PSI-101', 'SAME VPRED Matrix PLN-005 Baseline.txt', 'Engineering Documents'),
    ('PSI-101', 'SAME-R_Final Report.pdf', 'Reports'),
    ('PSI-101', 'SAME-R_ThermalPrecipitatorUsage.txt', 'Engineering Documents'),
    ('PSI-101', 'SAME_Baseline Concept Description Document_001 Rev A.txt', 'Science Documents'),
    ('PSI-101', 'SAME_Operations Manual_007.txt', 'Science Documents'),
    ('PSI-101', 'SAME_Wire_Report.txt', 'Engineering Documents'),
    ('PSI-102', 'SAME VPRED Matrix PLN-005 Baseline.txt', 'Engineering Documents'),
    ('PSI-102', 'SAME Verification Plan and Engineering Requirements Document (VPRED)_January 2007.txt', 'Engineering Documents'),
    ('PSI-102', 'SAME_Baseline Concept Description Doc.txt', 'Science Documents'),
    ('PSI-102', 'SAME_EIRD.txt', 'Engineering Documents'),
    ('PSI-102', 'SAME_Final Science Report.pdf', 'Reports'),
    ('PSI-102', 'SAME_IgnitorWireCharacterizationReport.txt', 'Engineering Documents'),
    ('PSI-102', 'SAME_Operations Manual_007.txt', 'Science Documents'),
    ('PSI-107', 'Dotson_umd_0117N_10980.pdf', 'Reports'),
    ('PSI-107', 'Exp_19-20_SPICE_30-Day_PostFlight_Report.pdf', 'Reports'),
    ('PSI-107', 'MEM-010.txt', 'Engineering Documents'),
    ('PSI-107', 'SLICE 4.001 SPICE Video Overlay Reset-MGUEMSGSLCEC001.txt', 'Reference Data'),
    ('PSI-107', 'SPICE Final Report 12_2_2012.pdf', 'Reports'),
    ('PSI-107', 'SPICE Phase III Flight Safety Data Package_May 2008.txt', 'Engineering Documents'),
    ('PSI-107', 'SPICE RPT-002 Science Verif Report_May 2007.txt', 'Engineering Documents'),
    ('PSI-107', 'SPICE SRD 8-23-07 with sigs.txt', 'Science Documents'),
    ('PSI-20', 'ACME-BRE_DoD.txt', 'Science Documents'),
    ('PSI-20', 'ACME_Engineering Requirements Doc Rev K.txt', 'Engineering Documents'),
    ('PSI-20', 'ACME_engineering_20210328.txt', 'Engineering Documents'),
    ('PSI-20', 'ACME_non-imaging_data_file_description.txt', 'Science Documents'),
    ('PSI-20', 'BRE_SRD_201306.txt', 'Science Documents'),
    ('PSI-20', 'BRE_data_interpretation_20220804.txt', 'Science Documents'),
    ('PSI-20', 'BRE_final_report_20220201.pdf', 'Reports'),
    ('PSI-20', 'BRE_science_concept_RDR_201306.txt', 'Science Documents'),
    ('PSI-20', 'Dissertation-PD-revised_.pdf', 'Reports'),
    ('PSI-22', 'ACME - Engineering Requirements Doc Rev K.txt', 'Engineering Documents'),
    ('PSI-22', 'ACME-DOC-010_D.txt', 'Reference Data'),
    ('PSI-22', 'ACME_engineering_20210328.txt', 'Engineering Documents'),
    ('PSI-22', 'E-FIELD Flames 30-day report Inc 55-56 20181115.pdf', 'Reports'),
    ('PSI-22', 'E-FIELD Flames 30-day report Inc 57-58 20190601.pdf', 'Reports'),
    ('PSI-22', 'E-FIELD Flames Final Report.pdf', 'Reports'),
    ('PSI-22', 'E-FIELD_Flames_SRD_20100402.txt', 'Science Documents'),
    ('PSI-23', 'ACME non-imaging data file description.txt', 'Science Documents'),
    ('PSI-23', 'ACME s-Flame  DoD.txt', 'Science Documents'),
    ('PSI-23', 'ACME_engineering_20210328.txt', 'Engineering Documents'),
    ('PSI-23', 's-Flame 30-day report Inc 63 20201216.pdf', 'Reports'),
    ('PSI-23', 's-Flame SCR 200802.txt', 'Science Documents'),
    ('PSI-23', 's-Flame_SRD_20100125.txt', 'Science Documents'),
    ('PSI-23', 's-Flame_data_interpretation_20210920.txt', 'Engineering Documents'),
    ('PSI-23', 's-Flames_procedure_20210408.txt', 'Engineering Documents'),
    ('PSI-23', 's_Flame_final_report_20210729.pdf', 'Reports'),
    ('PSI-25', 'BASS-2 Engineering Requirements.txt', 'Engineering Documents'),
    ('PSI-25', 'BASS-II Test Matrix by PI Final.txt', 'Science Documents'),
    ('PSI-25', 'BASS-II data FAQ.txt', 'Science Documents'),
    ('PSI-25', 'SRD_BASS-II.txt', 'Science Documents'),
    ('PSI-25', 'TM-20210011385.pdf', 'Reports'),
    ('PSI-26', 'As Run_Test Matrix.txt', 'Science Documents'),
    ('PSI-26', 'BASS ERD.txt', 'Engineering Documents'),
    ('PSI-26', 'BASS_SysAcceptanceReview.1.txt', 'Engineering Documents'),
    ('PSI-26', 'BASS_SysAcceptanceReview.2.txt', 'Engineering Documents'),
    ('PSI-26', 'DLD_BASS.txt', 'Science Documents'),
    ('PSI-26', 'FlammabilityAspectsofFabric_USNationalCombustion.2013.txt', 'Science Documents'),
    ('PSI-26', 'NTRS 20140011099 - BASS Flight Results.pdf', 'Reports'),
    ('PSI-26', 'Planned_Test Matrix.txt', 'Science Documents'),
    ('PSI-26', 'SRD_BASS.txt', 'Science Documents'),
    ('PSI-39', 'CFI Operational Requirements and Protocols.txt', 'Engineering Documents'),
    ('PSI-39', 'CFI Science Final Report.pdf', 'Reports'),
    ('PSI-39', 'CFI_DataSummary_Spreadsheet_Jan2021.txt', 'Science Documents'),
    ('PSI-39', 'Pres_SCR_CFI.txt', 'Science Documents'),
    ('PSI-39', 'SRD_CFI.txt', 'Science Documents'),
    ('PSI-47', 'DAFT 1 year report 10 30 07 b.txt', 'Reports'),
    ('PSI-47', 'DAFT Images.txt', 'Engineering Documents'),
    ('PSI-47', 'DAFT final report 6 24 08 as submitted.txt', 'Reports'),
    ('PSI-47', 'Exp_13_DAFT_30-Day_Postflight_Report.pdf', 'Reports'),
    ('PSI-47', 'MGUEEXPRSDAFTN010 - 2.010.txt', 'Engineering Documents'),
    ('PSI-47', 'MGUEEXPRSDAFTN011 - 2.011.txt', 'Engineering Documents'),
    ('PSI-47', 'MGUEEXPRSDAFTN012 - 2.012.txt', 'Engineering Documents'),
    ('PSI-47', 'MGUEEXPRSDAFTN013 - 2.013.txt', 'Engineering Documents'),
    ('PSI-68', 'FLEX-2 DoD.txt', 'Science Documents'),
    ('PSI-68', 'FLEX-2 Hardware Presentation.txt', 'Engineering Documents'),
    ('PSI-68', 'FLEX-2 SRD Final.txt', 'Science Documents'),
    ('PSI-69', 'FLEX Overall Ext File-2.txt', 'Engineering Documents'),
    ('PSI-69', 'FLEX-2 Engineering Requirements Document.txt', 'Engineering Documents'),
    ('PSI-98', 'NTRS 20180004258 - Saffire I-III Results Overview.pdf', 'Reports'),
    ('PSI-98', 'SAFFIRE Objectives, Development and Status.txt', 'Science Documents'),
    ('PSI-98', 'SAFFIRE-I Operations.txt', 'Engineering Documents'),
    ('PSI-98', 'SAFFIRE-I and SAFFIRE-III Readme.txt', 'Science Documents'),
    ('PSI-99', 'NTRS 20170000230 - Saffire I-III Operation and Development.txt', 'Engineering Documents'),
    ('PSI-99', 'NTRS 20180004258 - Saffire I-III Results Overview.pdf', 'Reports'),
    ('PSI-99', 'NTRS 20200000557 - Saffire II PMMA Flame Spread.pdf', 'Reports'),
    ('PSI-99', 'SAFFIRE Objectives, Development and Status.txt', 'Science Documents'),
    ('PSI-99', 'SAFFIRE-II Readme.txt', 'Science Documents')
) AS verified(investigation_id, file_name, source_type)
WHERE d.investigation_id = verified.investigation_id
  AND d.file_name = verified.file_name
  AND d.source_type = 'Other Sources';

CREATE INDEX IF NOT EXISTS rag_documents_source_collection_idx
ON rag_documents (source_type, embedding_model, investigation_id);
