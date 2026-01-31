"""
AnimalMind Agent System
Multi-agent discussion and research system for animal health breakthroughs.
"""

import os
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime

# Configuration constants
MAX_CONTEXT_MESSAGES = 5
MAX_SUMMARY_CONTENT_LENGTH = 100


@dataclass
class Message:
    """Represents a message in the discussion."""
    agent_name: str
    content: str
    timestamp: datetime
    topic: str


class Agent:
    """Base class for AI agents in the AnimalMind system."""
    
    def __init__(self, name: str, specialization: str, expertise: List[str]):
        self.name = name
        self.specialization = specialization
        self.expertise = expertise
        self.conversation_history: List[Message] = []
    
    def generate_response(self, topic: str, context: List[Message]) -> str:
        """
        Generate a response based on the topic and conversation context.
        In a real implementation, this would call an LLM API.
        """
        # Build context from recent messages
        recent_context = context[-MAX_CONTEXT_MESSAGES:]
        context_str = "\n".join([f"{msg.agent_name}: {msg.content}" for msg in recent_context])
        
        # Create a structured prompt for the agent
        prompt = self._build_prompt(topic, context_str)
        
        # For now, return a simulated response
        # In production, this would call OpenAI or another LLM
        return self._simulate_response(topic, context_str)
    
    def _build_prompt(self, topic: str, context: str) -> str:
        """Build a prompt for the LLM based on agent's specialization."""
        return f"""You are {self.name}, a {self.specialization} specializing in {', '.join(self.expertise)}.

Topic: {topic}

Recent conversation:
{context}

Provide your expert insight on this topic, focusing on potential breakthroughs or important considerations for animal health. Be specific and actionable."""
    
    def _simulate_response(self, topic: str, context: str) -> str:
        """Simulate a response based on specialization (for demonstration)."""
        responses = {
            "Veterinary Medicine": f"From a veterinary perspective on {topic}, I recommend focusing on diagnostic improvements and preventive care protocols.",
            "Animal Nutrition": f"Regarding {topic}, nutritional interventions could play a crucial role. We should explore dietary modifications and supplement optimization.",
            "Animal Behavior": f"Understanding behavioral patterns related to {topic} is essential. Stress reduction and environmental enrichment may be key factors.",
            "Genetics": f"The genetic basis of {topic} deserves investigation. Gene therapy and selective breeding approaches could offer long-term solutions.",
            "Epidemiology": f"From an epidemiological standpoint on {topic}, we need to track patterns and identify risk factors across populations."
        }
        return responses.get(self.specialization, f"As a {self.specialization} expert, I have insights on {topic}.")
    
    def contribute(self, topic: str, context: List[Message]) -> Message:
        """Make a contribution to the discussion."""
        response = self.generate_response(topic, context)
        message = Message(
            agent_name=self.name,
            content=response,
            timestamp=datetime.now(),
            topic=topic
        )
        self.conversation_history.append(message)
        return message


class ResearchCoordinator:
    """Coordinates multi-agent research discussions."""
    
    def __init__(self):
        self.agents: List[Agent] = []
        self.conversation_log: List[Message] = []
        self.research_topics: List[str] = []
    
    def add_agent(self, agent: Agent):
        """Add an agent to the research team."""
        self.agents.append(agent)
    
    def conduct_discussion(self, topic: str, rounds: int = 3) -> List[Message]:
        """
        Conduct a multi-round discussion on a topic.
        
        Args:
            topic: The research topic to discuss
            rounds: Number of discussion rounds
            
        Returns:
            List of all messages in the discussion
        """
        print(f"\n{'='*80}")
        print(f"RESEARCH DISCUSSION: {topic}")
        print(f"{'='*80}\n")
        
        discussion_messages = []
        
        for round_num in range(rounds):
            print(f"\n--- Round {round_num + 1} ---\n")
            
            for agent in self.agents:
                # Each agent contributes based on the current context
                message = agent.contribute(topic, discussion_messages)
                discussion_messages.append(message)
                self.conversation_log.append(message)
                
                # Display the contribution
                print(f"{agent.name} ({agent.specialization}):")
                print(f"  {message.content}\n")
        
        return discussion_messages
    
    def generate_research_summary(self, messages: List[Message]) -> str:
        """Generate a summary of the research discussion."""
        if not messages:
            return "No discussion to summarize."
        
        topic = messages[0].topic
        agent_names = list(set([msg.agent_name for msg in messages]))
        
        summary = f"""
RESEARCH SUMMARY: {topic}
{'='*80}

Participants: {', '.join(agent_names)}
Total Contributions: {len(messages)}
Discussion Period: {messages[0].timestamp.strftime('%Y-%m-%d %H:%M')} - {messages[-1].timestamp.strftime('%H:%M')}

Key Areas Discussed:
"""
        # Group by specialization
        by_spec = {}
        for msg in messages:
            agent = next((a for a in self.agents if a.name == msg.agent_name), None)
            if agent:
                if agent.specialization not in by_spec:
                    by_spec[agent.specialization] = []
                by_spec[agent.specialization].append(msg.content)
        
        for spec, contents in by_spec.items():
            summary += f"\n{spec}:\n"
            for content in contents:
                if len(content) > MAX_SUMMARY_CONTENT_LENGTH:
                    summary += f"  - {content[:MAX_SUMMARY_CONTENT_LENGTH]}...\n"
                else:
                    summary += f"  - {content}\n"
        
        summary += f"\n{'='*80}\n"
        return summary


def create_animal_health_team() -> ResearchCoordinator:
    """Create a team of specialized agents for animal health research."""
    coordinator = ResearchCoordinator()
    
    # Create specialized agents
    agents = [
        Agent(
            name="Dr. Sarah Chen",
            specialization="Veterinary Medicine",
            expertise=["diagnostics", "surgery", "preventive care"]
        ),
        Agent(
            name="Dr. James Wilson",
            specialization="Animal Nutrition",
            expertise=["dietary optimization", "supplements", "metabolic health"]
        ),
        Agent(
            name="Dr. Maria Rodriguez",
            specialization="Animal Behavior",
            expertise=["stress reduction", "enrichment", "welfare assessment"]
        ),
        Agent(
            name="Dr. Li Zhang",
            specialization="Genetics",
            expertise=["gene therapy", "breeding", "hereditary diseases"]
        ),
        Agent(
            name="Dr. Ahmed Hassan",
            specialization="Epidemiology",
            expertise=["disease tracking", "risk assessment", "population health"]
        )
    ]
    
    for agent in agents:
        coordinator.add_agent(agent)
    
    return coordinator


def main():
    """Main function to run the AnimalMind research system."""
    print("\n" + "="*80)
    print("ANIMALMIND - AI Agents Researching Animal Health Breakthroughs")
    print("="*80)
    
    # Create the research team
    coordinator = create_animal_health_team()
    
    # Define research topics
    research_topics = [
        "Innovative approaches to treating chronic pain in senior dogs",
        "Breakthrough nutrition strategies for extending feline lifespan",
        "Novel methods for early detection of cancer in pets"
    ]
    
    # Conduct research discussions
    for topic in research_topics:
        messages = coordinator.conduct_discussion(topic, rounds=2)
        summary = coordinator.generate_research_summary(messages)
        print(summary)
    
    print("\nResearch session complete!")
    print(f"Total discussions: {len(research_topics)}")
    print(f"Total contributions: {len(coordinator.conversation_log)}")


if __name__ == "__main__":
    main()
