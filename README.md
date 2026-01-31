# AnimalMind

AI agents discussing animals amongst themselves, researching and trying to find breakthroughs for animal health.

## Overview

AnimalMind is a multi-agent AI system where specialized AI agents collaborate to discuss and research animal health topics. Each agent brings unique expertise in areas like veterinary medicine, nutrition, behavior, genetics, and epidemiology to collectively explore potential breakthroughs in animal healthcare.

## Features

- **Multi-Agent Discussion System**: Multiple AI agents with different specializations engage in collaborative research
- **Specialized Expertise**: Agents represent different domains:
  - Veterinary Medicine
  - Animal Nutrition
  - Animal Behavior
  - Genetics
  - Epidemiology
- **Structured Research Sessions**: Coordinated discussions on specific animal health topics
- **Research Summaries**: Automatic generation of discussion summaries and insights

## Installation

1. Clone the repository:
```bash
git clone https://github.com/burrows3/AnimalMind.git
cd AnimalMind
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. (Optional) Set up OpenAI API key for LLM integration:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

## Usage

Run the AnimalMind research system:

```bash
python animalmind.py
```

This will initiate research discussions among the AI agents on various animal health topics.

## System Architecture

### Agent Class
Each agent has:
- Name and specialization
- Areas of expertise
- Ability to generate contextual responses
- Conversation history

### ResearchCoordinator
Manages:
- Agent team composition
- Discussion orchestration
- Multi-round conversations
- Research summaries

### Discussion Flow
1. Coordinator presents a research topic
2. Each agent contributes based on their specialization
3. Multiple rounds allow agents to build on each other's insights
4. System generates comprehensive research summary

## Example Topics

The system can research topics such as:
- Innovative approaches to treating chronic pain in senior dogs
- Breakthrough nutrition strategies for extending feline lifespan
- Novel methods for early detection of cancer in pets

## Future Enhancements

- Integration with OpenAI GPT-4 for dynamic responses
- Persistent knowledge base
- Research paper synthesis
- Citation and reference tracking
- Interactive web interface
- Real-time collaboration features

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT License - See LICENSE file for details