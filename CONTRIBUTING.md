# Contributing to SENTINEL Deepfake Detection System

Thank you for your interest in contributing to SENTINEL! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please:

- Be respectful and constructive in discussions
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18+ installed
- **Python** 3.10+ installed
- **MongoDB** 7.0+ running locally or via Docker
- **FFmpeg** installed on your system
- **Git** for version control
- **Docker** (recommended for development)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/your-username/deepfake-detection-system.git
cd deepfake-detection-system
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/original-org/deepfake-detection-system.git
```

---

## Development Setup

### Quick Setup with Docker

The easiest way to get started is using Docker:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Setup

#### 1. Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3002`

#### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server with hot reload
npm run dev
```

The backend API will be available at `http://localhost:3001`

#### 3. ML Service

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the service
python app.py
```

The ML service will be available at `http://localhost:5000`

---

## Project Structure

```
deepfake-detection-system/
├── app/                    # Next.js pages (App Router)
├── backend/                # Express.js backend
│   └── src/
│       ├── agents/         # 4-Agent AI pipeline
│       ├── auth/           # Authentication module
│       ├── scans/          # Scan management
│       ├── users/          # User management
│       ├── admin/          # Admin routes
│       ├── audit/          # Audit logging
│       ├── ml/             # ML service client
│       ├── security/       # Security utilities
│       ├── utils/          # Utilities (FFmpeg, logging)
│       └── config/         # Configuration
├── ml-service/             # Python ML service
│   ├── app.py              # Flask application
│   ├── model_loader.py     # Model loading
│   └── preprocessing.py    # Image preprocessing
├── components/             # React components
├── lib/                    # Frontend utilities
├── contexts/               # React contexts
├── docs/                   # Documentation
└── docker-compose.yml      # Docker configuration
```

---

## Making Changes

### Branching Strategy

1. Create a new branch from `master`:

```bash
git checkout master
git pull upstream master
git checkout -b feature/your-feature-name
```

2. Branch naming conventions:
   - `feature/` - New features
   - `fix/` - Bug fixes
   - `docs/` - Documentation changes
   - `refactor/` - Code refactoring
   - `test/` - Test additions/modifications

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(scans): add batch upload support

fix(auth): resolve token refresh issue

docs(api): update endpoint documentation

refactor(agents): simplify detection agent logic
```

### Keep Commits Focused

- Make small, focused commits
- Each commit should be a single logical change
- Avoid mixing unrelated changes in one commit

---

## Coding Standards

### JavaScript/TypeScript (Frontend & Backend)

- Use ESLint and Prettier for formatting
- Follow existing code style
- Use TypeScript for new frontend components
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

```javascript
/**
 * Process a scan through the detection pipeline
 * @param {string} scanId - The unique scan identifier
 * @param {Object} options - Processing options
 * @returns {Promise<ScanResult>} The scan result
 */
async function processScan(scanId, options) {
  // Implementation
}
```

### Python (ML Service)

- Follow PEP 8 style guide
- Use type hints for function signatures
- Add docstrings for functions and classes
- Use meaningful variable names

```python
def preprocess_image(image_path: str, size: tuple = (224, 224)) -> torch.Tensor:
    """
    Preprocess an image for model inference.

    Args:
        image_path: Path to the image file
        size: Target size (width, height)

    Returns:
        Preprocessed image tensor
    """
    # Implementation
```

### React Components

- Use functional components with hooks
- Use TypeScript for prop types
- Keep components focused and reusable
- Extract complex logic to custom hooks

```typescript
interface MediaScannerProps {
  onScanComplete: (result: ScanResult) => void;
  maxFileSize?: number;
}

export function MediaScanner({ onScanComplete, maxFileSize = 500 * 1024 * 1024 }: MediaScannerProps) {
  // Implementation
}
```

---

## Testing

### Running Tests

```bash
# Frontend tests
npm test

# Backend tests
cd backend
npm test

# ML service tests
cd ml-service
pytest
```

### Writing Tests

- Write tests for new features
- Update tests when modifying existing functionality
- Aim for meaningful test coverage
- Test edge cases and error conditions

### Test Structure

```javascript
describe('ScanService', () => {
  describe('processScan', () => {
    it('should process an image successfully', async () => {
      // Test implementation
    });

    it('should handle invalid file types', async () => {
      // Test implementation
    });
  });
});
```

---

## Pull Request Process

### Before Submitting

1. **Update your branch:**
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. **Run linting:**
   ```bash
   npm run lint
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Update documentation** if needed

### Submitting a PR

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a Pull Request on GitHub

3. Fill in the PR template with:
   - Clear description of changes
   - Related issue numbers
   - Screenshots (for UI changes)
   - Testing instructions

### PR Review

- Address review feedback promptly
- Keep the discussion constructive
- Update your branch if requested
- Squash commits if needed before merge

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated (if applicable)
- [ ] No sensitive data committed
- [ ] Commit messages follow conventions
- [ ] Branch is up-to-date with master

---

## Reporting Issues

### Bug Reports

When reporting a bug, include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: OS, browser, Node.js version, etc.
6. **Screenshots/Logs**: If applicable

### Feature Requests

When requesting a feature, include:

1. **Description**: Clear description of the feature
2. **Use Case**: Why this feature would be useful
3. **Proposed Solution**: How you envision it working
4. **Alternatives**: Any alternatives you've considered

### Security Issues

For security vulnerabilities, please **do not** create a public issue. Instead:

1. Email security concerns privately
2. Include detailed description of the vulnerability
3. Provide steps to reproduce if possible
4. Allow time for the issue to be addressed before disclosure

---

## Development Tips

### Useful Commands

```bash
# Start all services with Docker
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f ml-service

# Restart a specific service
docker-compose restart backend

# Run database seed
docker-compose exec backend npm run seed

# Access backend shell
docker-compose exec backend sh

# Run backend in development mode with hot reload
cd backend && npm run dev

# Run frontend in development mode
npm run dev
```

### Debugging

**Backend:**
- Use Winston logger for debugging
- Check `backend/logs/app.log` for detailed logs
- Use `DEBUG=*` environment variable for verbose output

**ML Service:**
- Check `ml-service/ml-service.log` for logs
- Use `FLASK_DEBUG=1` for debug mode

**Frontend:**
- Use React DevTools for component debugging
- Check browser console for errors
- Use Network tab to inspect API calls

### Common Issues

**Port already in use:**
```bash
# Find and kill process using port 3001
lsof -i :3001
kill -9 <PID>
```

**MongoDB connection failed:**
```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Restart MongoDB
docker-compose restart mongodb
```

**ML model not loading:**
```bash
# Check ML service logs
docker-compose logs ml-service

# Verify model file exists
ls -la ml-service/efficientnet_b0_ffpp_c23/
```

---

## Getting Help

- Check existing [issues](https://github.com/your-org/deepfake-detection-system/issues)
- Read the [documentation](docs/)
- Ask questions in discussions

---

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes for significant contributions
- README acknowledgments for major features

Thank you for contributing to SENTINEL!
