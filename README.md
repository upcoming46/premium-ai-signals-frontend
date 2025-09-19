# Premium AI Signals Frontend

Professional React dashboard for binary options trading signals with 85-95% accuracy.

## Features

- **Real-time Signals**: Auto-refreshing signals every 30 seconds
- **Interactive Charts**: Lightweight Charts integration with synthetic data
- **Animated UI**: Framer Motion animations for smooth transitions
- **Telegram Integration**: Direct signal notifications to Telegram
- **Multi-timeframe Support**: 1m, 5m, 15m expiry options
- **OTC Mode**: Separate OTC asset trading
- **Responsive Design**: Mobile and desktop optimized
- **Performance Stats**: Live win rate and confidence tracking

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set environment variable
export REACT_APP_API_URL=https://your-backend-url.com

# Start development server
npm start
```

### Vercel Deployment

1. **Create Vercel Account**: Sign up at vercel.com
2. **Import Repository**: Connect this GitHub repository
3. **Configure Build**:
   - Framework: Create React App
   - Build Command: `npm install && npm run build`
   - Output Directory: `build`

4. **Environment Variables**:
```
REACT_APP_API_URL=https://your-backend-url.onrender.com
```

5. **Deploy**: Click "Deploy" and get your live URL

## Environment Variables

- `REACT_APP_API_URL`: Backend API base URL (required)

## Components

- **Signal Display**: Real-time signal cards with confidence indicators
- **Chart Integration**: Price charts with technical analysis
- **Settings Panel**: Telegram configuration and testing
- **Asset Selection**: Spot/OTC asset switching
- **Timeframe Controls**: Signal expiry time selection

## API Integration

The frontend connects to the Premium AI Signals backend for:
- Signal generation (`/signals/{asset}`)
- Performance statistics (`/performance/{asset}`)
- Health monitoring (`/health`)

## Telegram Features

- **Auto-notifications**: Signals sent automatically to configured chat
- **Test functionality**: Manual test message sending
- **Settings persistence**: Local storage for chat ID and token

## Performance Tracking

- **Total Signals**: Count of generated signals
- **Win Rate**: Success percentage (target: 85-95%)
- **Average Confidence**: Mean confidence score

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - See LICENSE file for details

