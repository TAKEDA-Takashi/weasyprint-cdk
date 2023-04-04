import os

import boto3
import pandas as pd
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

data_name = "securityhub_data.xlsx"
bucket_name = os.environ["BUCKET_NAME"]

s3 = boto3.resource("s3")
bucket = s3.Bucket(bucket_name)
data_path = os.path.join("/tmp", data_name)


def get_report_data():
    # intで欠損値を扱えるようにする(試験的機能)
    pd.options.mode.use_inf_as_na = True
    bucket.download_file(f"data_files/{data_name}", data_path)
    df = pd.read_excel(
        data_path,
        dtype={
            "AccountID": str,
            "SecurityHubScore": int,
            "LastMonthSecurityHubScore": "Int64",
            "HighCount": int,
        },
    )
    return df


def save_report(account_id, html_report):
    report_name = f"{account_id}-report.pdf"
    report_path = os.path.join("/tmp", report_name)
    HTML(string=html_report).write_pdf(report_path, stylesheets=["style.css"])
    bucket.upload_file(report_path, f"output/{report_name}")


def handler(event, context):
    report_date = "2023年2月"
    df = get_report_data()
    for _, row in df.iterrows():
        # get a account data
        account_id = row["AccountID"]
        securityhub_score = row["SecurityHubScore"]

        # Generate angles for drawing semi-pie charts
        score_rotate = 180 * (securityhub_score / 100)
        lastmonth_score = row["LastMonthSecurityHubScore"]
        diff_score = "-"
        if lastmonth_score is not pd.NA:
            diff_score = f"{securityhub_score - lastmonth_score:+}%"
        high_count = row["HighCount"]
        report_title = f"Security Hub {report_date}定期レポート - {account_id}"

        # create Jinja template
        env = Environment(loader=FileSystemLoader("."))
        template = env.get_template("report_template.html")
        template_vars = {
            "title": report_title,
            "account_id": account_id,
            "score_rotate": score_rotate,
            "securityhub_score": securityhub_score,
            "diff_score": diff_score,
            "high_count": high_count,
        }

        # Render our file and create the PDF using our css style file
        html_report = template.render(template_vars)
        save_report(account_id, html_report)
