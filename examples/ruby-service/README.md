# Ruby Service Example - AI Policies

This is an example Ruby web service demonstrating how to use AI Policies to manage AI assistant rules for both Cursor and GitHub Copilot in a Ruby/Sinatra application.

## Overview

This Ruby service uses AI Policies to:

- Enforce security and safety guidelines for AI-generated code
- Apply Ruby-specific development patterns and best practices
- Maintain consistent code quality across the team
- Ensure proper database and API patterns

## AI Policies Configuration

### Policy Packages Used

- **@ai-policies/core**: Core safety and security rules

### Generated Files

- `.cursorrules` - Rules for Cursor IDE
- `.copilot/instructions.md` - Instructions for GitHub Copilot

## Getting Started

### Prerequisites

- Ruby 3.2.0+
- Bundler
- PostgreSQL (for production use)
- AI Policies CLI

### Installation

1. Install Ruby dependencies:

```bash
bundle install
```

2. Install AI Policies CLI:

```bash
npm install -g @ai-policies/cli
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Development

1. Start the server:

```bash
bundle exec ruby app.rb
```

2. To update AI Policies configurations:

```bash
ai-policies sync
```

3. To check for policy changes:

```bash
ai-policies diff
```

4. To validate your setup:

```bash
ai-policies doctor
```

### Testing

Run the test suite:

```bash
bundle exec rspec
```

## AI Policies Features Demonstrated

### Security Guidelines

- Environment variable usage for sensitive configuration
- Parameterized queries to prevent SQL injection
- Secure error handling that doesn't expose internal details
- Proper logging without sensitive information

### Ruby Best Practices

- Clear method naming and structure
- Proper error handling with custom exception types
- Database transaction patterns
- RESTful API design

### Team Customizations

- RuboCop configuration adherence
- Sequel ORM usage patterns
- RSpec testing standards
- Database constraint recommendations

## Project Structure

```
lib/
├── models/             # Database models
├── services/           # Business logic services
├── controllers/        # API controllers
└── utils/              # Utility classes

config/
├── database.rb         # Database configuration
└── environment.rb      # Environment setup

spec/
├── models/             # Model tests
├── services/           # Service tests
└── controllers/        # Controller/integration tests

.ai-policies.yaml       # AI Policies configuration
.cursorrules           # Generated Cursor rules
.copilot/
└── instructions.md    # Generated Copilot instructions
```

## Example Code Patterns

### Service Class with AI Policies

```ruby
class UserService
  def self.create_user(email:, password:)
    # Input validation (AI Policies guideline)
    raise ArgumentError, 'Email is required' if email.nil? || email.strip.empty?
    raise ArgumentError, 'Invalid email format' unless valid_email?(email)

    # Use environment variables for configuration (Security rule)
    min_password_length = ENV.fetch('MIN_PASSWORD_LENGTH', '8').to_i
    raise ArgumentError, 'Password too short' if password.length < min_password_length

    # Database transaction (Team guideline)
    DB.transaction do
      user_id = DB[:users].insert(
        email: email.downcase.strip,
        password_hash: BCrypt::Password.create(password),
        created_at: Time.now
      )

      # Logging without sensitive data (Security rule)
      logger.info "User created", user_id: user_id, email: email

      user_id
    end
  rescue Sequel::UniqueConstraintViolation
    raise UserExistsError, 'User with this email already exists'
  end

  private

  def self.valid_email?(email)
    email.match?(/\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i)
  end
end
```

### API Endpoint with Error Handling

```ruby
# Following AI Policies guidelines for API design
get '/api/users/:id' do
  content_type :json

  begin
    user_id = params[:id].to_i
    raise ArgumentError, 'Invalid user ID' if user_id <= 0

    user = UserService.find_user(user_id)
    raise NotFoundError, 'User not found' if user.nil?

    # Return safe data only (Privacy guideline)
    {
      id: user[:id],
      email: user[:email],
      created_at: user[:created_at]
    }.to_json
  rescue ArgumentError => e
    status 400
    { error: e.message }.to_json
  rescue NotFoundError => e
    status 404
    { error: e.message }.to_json
  rescue => e
    # Log full error but return generic message (Security rule)
    logger.error "Unexpected error in GET /api/users/#{params[:id]}", error: e.message, backtrace: e.backtrace
    status 500
    { error: 'Internal server error' }.to_json
  end
end
```

## Customizing AI Policies

### Modifying Team Guidelines

Edit the `overrides.teamAppendContent` section in `.ai-policies.yaml`:

```yaml
overrides:
  teamAppendContent: |
    ## Custom Ruby Guidelines
    - Use ActiveRecord instead of Sequel (if switching ORMs)
    - Follow company-specific naming conventions
    - Include custom logging requirements
```

### Environment Variables

Create a `.env` file for local development:

```env
DATABASE_URL=postgres://localhost/myapp_development
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your_jwt_secret_here
MIN_PASSWORD_LENGTH=8
```

## CI/CD Integration

Add AI Policies validation to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Validate AI Policies
  run: |
    npm install -g @ai-policies/cli
    ai-policies validate
    ai-policies doctor
```

## Working with AI Assistants

### Cursor IDE

With the generated `.cursorrules` file, Cursor will:

- Suggest secure database query patterns
- Recommend proper error handling
- Enforce input validation practices
- Apply Ruby idioms consistently

### GitHub Copilot

The `.copilot/instructions.md` file helps Copilot:

- Generate secure API endpoints
- Follow team testing patterns
- Apply proper logging practices
- Suggest appropriate error handling

## Learn More

- [AI Policies Documentation](https://github.com/ai-policies/ai-policies)
- [Sinatra Documentation](http://sinatrarb.com/)
- [Sequel ORM Documentation](https://sequel.jeremyevans.net/)
- [RSpec Documentation](https://rspec.info/)
