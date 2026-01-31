"""
Configuration file for AnimalMind research system.
"""

# Agent configurations
AGENTS_CONFIG = [
    {
        "name": "Dr. Sarah Chen",
        "specialization": "Veterinary Medicine",
        "expertise": ["diagnostics", "surgery", "preventive care"]
    },
    {
        "name": "Dr. James Wilson",
        "specialization": "Animal Nutrition",
        "expertise": ["dietary optimization", "supplements", "metabolic health"]
    },
    {
        "name": "Dr. Maria Rodriguez",
        "specialization": "Animal Behavior",
        "expertise": ["stress reduction", "enrichment", "welfare assessment"]
    },
    {
        "name": "Dr. Li Zhang",
        "specialization": "Genetics",
        "expertise": ["gene therapy", "breeding", "hereditary diseases"]
    },
    {
        "name": "Dr. Ahmed Hassan",
        "specialization": "Epidemiology",
        "expertise": ["disease tracking", "risk assessment", "population health"]
    }
]

# Research topics to explore
RESEARCH_TOPICS = [
    "Innovative approaches to treating chronic pain in senior dogs",
    "Breakthrough nutrition strategies for extending feline lifespan",
    "Novel methods for early detection of cancer in pets",
    "Advanced therapies for managing diabetes in cats",
    "Emerging treatments for arthritis in aging horses"
]

# Discussion parameters
DISCUSSION_ROUNDS = 2
MAX_CONTEXT_MESSAGES = 5

# LLM Configuration (for future OpenAI integration)
LLM_MODEL = "gpt-4"
LLM_TEMPERATURE = 0.7
LLM_MAX_TOKENS = 500
