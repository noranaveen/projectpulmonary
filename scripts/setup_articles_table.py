#!/usr/bin/env python3
"""
Creates the DynamoDB `Articles` table (per docs/dynamodb-schema-plan.md)
and loads the two existing articles into it.

Run this on YOUR OWN machine (not in a cloud sandbox), with AWS credentials
configured, e.g.:

    pip install boto3
    aws configure          # paste your access key / secret / region when prompted
    python3 scripts/setup_articles_table.py

It is safe to re-run: table creation is skipped if the table already exists,
and put_item calls are idempotent (they just overwrite the same two items).
"""

import sys
import time

import boto3
from botocore.exceptions import ClientError

REGION = "us-east-1"
TABLE_NAME = "Articles"


def get_or_create_table():
    client = boto3.client("dynamodb", region_name=REGION)
    resource = boto3.resource("dynamodb", region_name=REGION)

    try:
        client.describe_table(TableName=TABLE_NAME)
        print(f"Table '{TABLE_NAME}' already exists — skipping creation.")
    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceNotFoundException":
            raise
        print(f"Creating table '{TABLE_NAME}'...")
        client.create_table(
            TableName=TABLE_NAME,
            AttributeDefinitions=[
                {"AttributeName": "slug", "AttributeType": "S"},
            ],
            KeySchema=[
                {"AttributeName": "slug", "KeyType": "HASH"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        waiter = client.get_waiter("table_exists")
        waiter.wait(TableName=TABLE_NAME)
        print(f"Table '{TABLE_NAME}' is active.")

    return resource.Table(TABLE_NAME)


ARTICLES = [
    {
        "slug": "how-wildfire-smoke-impacts-firefighters",
        "title": "How Wildfire Smoke Impacts Firefighters",
        "category": "exposure-science",
        "excerpt": (
            "Wildland firefighters inhale PM2.5, VOCs, and other carcinogenic "
            "compounds with little to no respiratory protection. Here's what "
            "that exposure does to lung tissue."
        ),
        "coverImageUrl": "/assets/images/hero-firestation.jpeg",
        "authorName": "Lakshay Eppan",
        "authorRole": "Project Pulmonary Intern",
        "authorInitials": "LE",
        "readTimeMinutes": 4,
        "publishedDate": "2026-01-15",  # TODO: replace with the real publish date
        "status": "published",
        "sources": [
            "International Agency for Research on Cancer (IARC)",
            "U.S. Environmental Protection Agency (EPA)",
            "American Lung Association",
            "National Institute of Environmental Health Sciences (NIEHS)",
        ],
        "bodyBlocks": [
            {"type": "p", "text": "It is well known that wildland firefighters face many serious health issues because of their exposure to wildfire smoke. The smoke they inhale contains harmful chemicals like PM2.5, VOCs, and other cancer-causing compounds. While health evaluations usually focus on immediate breathing problems, hidden damage to lung tissue can be overlooked. This article looks at the medical side of that problem."},
            {"type": "p", "text": "Wildland firefighters work under harsh conditions, surrounded by thick smoke. Unlike city firefighters, who carry heavy oxygen supplies and full face coverage, wildland firefighters typically go without that protection because they need to cover long distances over rough terrain for extended periods. As a result, they inhale large amounts of dust, PM2.5, harmful gases, and toxic chemicals like benzene."},
            {"type": "p", "text": "Being exposed to these toxins can lead to serious, lasting lung damage. Medical studies show firefighters develop lung disease at a much higher rate than the general public."},
            {"type": "stat", "label": "Statistic", "text": "Long-term health tracking shows wildland firefighters have an 8% to 43% higher risk of dying from lung cancer."},
            {"type": "p", "text": "Because of this data, the World Health Organization officially classifies firefighting as a high-risk, cancer-causing occupation. This shows that wildfire smoke isn't just a temporary irritant, but something that can lead to serious illness much later in life."},
            {"type": "p", "text": "PM2.5 particles found in wildfire smoke are so small that the nose and throat can't filter them out. Once inhaled, they travel into the lower lungs and settle in the alveoli, the tiny air sacs where oxygen exchange happens. There, the immune system tries to clean up the particles, but with too much smoke, immune cells become overworked. They overproduce free radicals, causing oxidative stress that breaks down cell walls, damages DNA, and triggers inflammation."},
            {"type": "flow", "text": "Wildfire Smoke → PM2.5 Enters Lungs → Alveoli → Oxidative Stress → Inflammation & DNA Damage"},
            {"type": "p", "text": "Wildfire smoke also contains toxic chemicals such as benzene and formaldehyde. Once in the lungs, these substances can enter the bloodstream and reach other cells in the body. There, they can break down into dangerous byproducts that bond chemically with DNA strands, causing genetic mutations that disrupt normal cell growth and repair. Over time, these changes can create scarring in the lungs, laying the groundwork for disease, including cancer."},
            {"type": "p", "text": "The direct link between wildfire smoke exposure and chronic lung disease shows that firefighter lung health can no longer be treated as a minor issue. The unseen nature of this harm means there is an urgent need for medical action: mandatory lung screenings, funding for firefighter lung research, and support for initiatives like Project Pulmonary that keep this community cared for."},
        ],
    },
    {
        "slug": "biomarkers-early-lung-damage",
        "title": "Biomarkers for Early Lung Damage in Wildland Firefighters",
        "category": "early-detection",
        "excerpt": (
            "Standard lung-function tests often miss smoke-related damage until "
            "it's advanced. Researchers are turning to measurable biomarkers to "
            "flag injury years before symptoms appear."
        ),
        "coverImageUrl": "/assets/images/hydration-dr-group.jpg",
        "authorName": "Lakshay Eppan",
        "authorRole": "Project Pulmonary Intern",
        "authorInitials": "LE",
        "readTimeMinutes": 5,
        "publishedDate": "2026-02-01",  # TODO: replace with the real publish date
        "status": "published",
        "sources": [
            "National Institutes of Health (NIH)",
            "National Institute of Environmental Health Sciences (NIEHS)",
            "CDC/NIOSH",
            "American Thoracic Society",
            "U.S. Environmental Protection Agency (EPA)",
            "American Lung Association",
        ],
        "bodyBlocks": [
            {"type": "p", "text": "Wildland firefighters are constantly exposed to PM2.5 and other harmful particles contained in wildfire smoke. The effects on the lungs often show up long before any visible signs of disease appear. Conventional tests tend to identify disease only after considerable damage has already been done. That's why scientists are increasingly focused on biomarkers: substances measurable in blood, breath, and other bodily fluids that can signal inflammation and lung injury."},
            {"type": "p", "text": "Because most lung diseases take years to develop, early detection is difficult. By the time symptoms appear, irreversible damage may already exist. Researchers are working to identify biomarkers that flag early-stage lung damage, so doctors can monitor firefighters more closely and intervene sooner."},
            {"type": "p", "text": "So what exactly is a biomarker? It's a measurable indicator of a physical process happening in the body, detectable in blood, urine, saliva, or breath. Several biomarkers have emerged as useful measures of smoke-related lung health:"},
            {"type": "bullets", "items": [
                {"term": "C-reactive protein", "text": "a marker of inflammation throughout the body."},
                {"term": "Interleukin-6", "text": "a protein released during immune responses."},
                {"term": "Club Cell Secretory Protein", "text": "a protein that decreases when lung tissue is damaged."},
                {"term": "8-Hydroxy-2'-deoxyguanosine", "text": "a marker of oxidative DNA damage caused by free radicals."},
            ]},
            {"type": "p", "text": "Wildfire smoke is made up of fine PM2.5 particles and toxins that inflame the lungs. Researchers have found that firefighters show short-term shifts in these biomarkers during wildfire incidents, even when standard lung-function tests still read normal. Scientists are now studying whether elevated biomarker levels during wildfire season can predict future disease, including COPD, pulmonary fibrosis, or lung cancer."},
            {"type": "flow", "text": "Wildfire Smoke Exposure → Lung Inflammation → Biomarker Changes → Early Detection → Earlier Treatment"},
            {"type": "p", "text": "Researchers are working to develop fast blood tests and diagnostics that can detect these biomarkers during or after wildfire season. Combined with medical imaging, biomarker screening could eventually help health professionals to:"},
            {"type": "bullets", "items": [
                {"term": "Detect lung injury before symptoms appear", "text": "new blood and respiratory tests aim to catch inflammation, oxidative stress, and cell damage earlier than firefighters currently notice symptoms."},
                {"term": "Monitor health across a wildfire season", "text": "tracking biomarkers before, during, and after wildfire season helps physicians tell short-lived inflammation apart from lasting smoke-inhalation damage."},
                {"term": "Identify firefighters who need closer monitoring", "text": "researchers are studying whether specific biomarkers correlate with higher lung cancer risk, which could mean more frequent checkups for those at greater risk."},
                {"term": "Support personalized treatment", "text": "future research aims to combine biomarker testing with pulmonary function testing, CT imaging, and exposure history to build individualized care plans."},
            ]},
            {"type": "p", "text": "While more research is still needed, biomarker screening could become a powerful tool for protecting the long-term health of firefighters working wildfire assignments."},
        ],
    },
]


def load_articles(table):
    for article in ARTICLES:
        table.put_item(Item=article)
        print(f"Wrote item: {article['slug']}")


def verify(table):
    resp = table.scan()
    print(f"\nTable now has {resp['Count']} item(s):")
    for item in resp["Items"]:
        print(f"  - {item['slug']} ({item['status']}, {item['category']})")


if __name__ == "__main__":
    try:
        table = get_or_create_table()
        load_articles(table)
        verify(table)
        print("\nDone. Articles table is live in DynamoDB.")
    except ClientError as e:
        print(f"AWS error: {e}", file=sys.stderr)
        sys.exit(1)
