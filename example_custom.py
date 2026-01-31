"""
Example: Custom research session with AnimalMind

This example shows how to create a custom research session
with specific topics and agent configurations.
"""

from animalmind import Agent, ResearchCoordinator


def run_custom_research():
    """Run a custom research session."""
    
    # Create a custom research coordinator
    coordinator = ResearchCoordinator()
    
    # Add custom agents - you can modify these as needed
    custom_agents = [
        Agent(
            name="Dr. Emma Thompson",
            specialization="Veterinary Medicine",
            expertise=["oncology", "immunology", "diagnostics"]
        ),
        Agent(
            name="Dr. Carlos Martinez",
            specialization="Animal Nutrition",
            expertise=["nutraceuticals", "longevity", "metabolic disorders"]
        ),
        Agent(
            name="Dr. Yuki Tanaka",
            specialization="Genetics",
            expertise=["genomics", "CRISPR", "hereditary conditions"]
        )
    ]
    
    for agent in custom_agents:
        coordinator.add_agent(agent)
    
    # Define custom research topics
    custom_topics = [
        "Gene editing approaches for eliminating hereditary diseases in dogs",
        "Immunotherapy breakthroughs for treating pet cancers"
    ]
    
    # Conduct research discussions
    print("\n" + "="*80)
    print("CUSTOM RESEARCH SESSION")
    print("="*80 + "\n")
    
    for topic in custom_topics:
        messages = coordinator.conduct_discussion(topic, rounds=3)
        summary = coordinator.generate_research_summary(messages)
        print(summary)
    
    print("\nCustom research session complete!")


if __name__ == "__main__":
    run_custom_research()
