window.HFAH_LEARN = {
  disclaimer:
    "Educational content only. Not financial advice. Simulated examples do not use real money " +
    "and do not predict future performance.",
  githubUrl: "https://github.com/ashlynbain/hedge-fund-at-home",

  lessons: [
    {
      id: "pipeline",
      title: "The four-step loop",
      summary:
        "Every systematic shop repeats the same shape: data, signal, risk, execution. This kit implements it in one Python process.",
      steps: [
        {
          title: "1. Data",
          body:
            "Daily OHLCV bars are fetched (yfinance in the default kit). Each bar is open, high, low, close, volume for a symbol like SPY.",
          callout: "File: hedgekit/core/marketdata.py",
        },
        {
          title: "2. Signal",
          body:
            "Your strategy reads bar history and returns zero or more OrderIntent objects. The example uses z-score mean reversion on one symbol.",
          callout: "File: strategies/example_mean_reversion/strategy.py",
        },
        {
          title: "3. Risk",
          body:
            "RiskGate checks position limits, gross exposure, daily loss, trade count, and KILL_SWITCH before any order is sent.",
          callout: "File: hedgekit/risk/gate.py",
        },
        {
          title: "4. Execution",
          body:
            "By default the simulated broker fills immediately at your limit price. No exchange connection. Paper/live are optional labs.",
          callout: "File: hedgekit/broker/simulated.py",
        },
      ],
    },
    {
      id: "mean-reversion",
      title: "Walkthrough: example mean reversion",
      summary:
        "The sample strategy trades one symbol with z-score mean reversion: enter when price stretches from its recent average, exit when it comes back.",
      params: [
        { name: "lookback", default: "20", meaning: "Bars used to compute mean and standard deviation of close." },
        { name: "entry_z", default: "2.0", meaning: "Enter when |z| exceeds this (price stretched vs recent mean)." },
        { name: "exit_z", default: "0.5", meaning: "Flatten when |z| falls below this (price back near mean)." },
        { name: "quantity", default: "10", meaning: "Shares per simulated order (education only)." },
      ],
      logic: [
        {
          title: "Compute z-score",
          formula: "z = (last_close − mean) / std",
          body: "Uses the last `lookback` closes. If std is tiny, a small epsilon avoids divide-by-zero.",
        },
        {
          title: "Short entry",
          body: "If z > entry_z and you are flat or long → SELL (bet price falls toward mean).",
        },
        {
          title: "Long entry",
          body: "If z < −entry_z and you are flat or short → BUY (bet price rises toward mean).",
        },
        {
          title: "Exit",
          body: "If |z| < exit_z and you have a position → trade to flat.",
        },
      ],
      pseudocode: `if len(bars) < lookback: return no orders
z = zscore(last lookback closes)
if z > entry_z and position <= 0: SELL quantity
if z < -entry_z and position >= 0: BUY quantity
if |z| < exit_z and position != 0: flatten`,
      tryIt:
        "Clone the repo, set entry_z to 1.5 vs 2.5 in config/config.yaml, re-run backtest, and compare fill counts.",
    },
    {
      id: "pairs-contrast",
      title: "Pairs trading vs single-name mean reversion",
      summary:
        "Pairs trading bets on the relationship between two instruments, not the direction of one stock. " +
        "It uses the same z-score idea as the single-symbol example — applied to the spread between two legs.",
      compare: [
        {
          term: "Mean reversion (shipped example)",
          detail: "One price series. Signal when SPY is far from its own moving average. Directional market exposure.",
        },
        {
          term: "Pairs trading",
          detail:
            "Two related instruments. Signal when the spread between them is unusual. Long cheap leg, short rich leg — often less directional.",
        },
      ],
      pairsSteps: [
        "Universe: find candidates in the same sector, supply chain, or ETF constituents.",
        "Test the relationship: correlation is not enough — look for cointegration / stationary spreads.",
        "Hedge ratio β from regression: spread = price_A − β × price_B (or use log prices).",
        "Signal: z-score the spread; enter when |z| exceeds a threshold.",
        "Exit: flatten both legs when spread reverts (or stop out on divergence).",
        "Risk: two fills, borrow on shorts, regime breaks (mergers, restructurings).",
      ],
      examples: [
        {
          pair: "KO / PEP",
          why: "Consumer staples beverage giants — often co-move; spread mean-reverts until a major regime shock.",
          caveat: "Structural breaks happen; never assume a pair is permanent.",
        },
        {
          pair: "XOM / CVX",
          why: "Large integrated oil companies share oil-beta; residual spread can oscillate.",
          caveat: "Commodity shocks widen spreads for long periods.",
        },
        {
          pair: "GLD / GDX",
          why: "Gold ETF vs gold miners — popular teaching pair with different betas.",
          caveat: "Miners carry equity risk; not a pure arbitrage.",
        },
      ],
      formulas: [
        {
          title: "Hedge ratio (OLS)",
          formula: "β = Cov(A, B) / Var(B)",
          body: "Regress price_A on price_B over a training window. β tells you how many shares of B hedge one share of A.",
        },
        {
          title: "Spread",
          formula: "spread_t = A_t − β × B_t",
          body: "The spread is what you mean-revert trade. Some desks use log(A) − β log(B).",
        },
        {
          title: "Spread z-score",
          formula: "z = (spread − μ) / σ",
          body: "μ and σ from a rolling lookback. Same intuition as single-name z-score, different series.",
        },
        {
          title: "Half-life",
          formula: "Δspread = λ × spread_lag + ε → half-life ≈ −ln(2)/λ",
          body: "Estimates how fast the spread closes. Helps set holding period and position sizing.",
        },
      ],
      pythonSketch: `# Educational sketch — see strategies/example_pairs/ in the repo
beta = cov(A, B) / var(B)
spread = A - beta * B
z = (spread[-1] - spread.mean()) / spread.std()
if z > entry_z:  long B, short A
if z < -entry_z: long A, short B`,
      note:
        "Educational only. The repo now includes strategies/example_pairs/ as a teaching module. " +
        "Use the spread playground below and Code lab to run Python demos.",
    },
    {
      id: "innovative-strategies",
      title: "Beyond pairs: strategy patterns to explore",
      summary:
        "Systematic desks rarely run one idea. Here are research directions that build on the same pipeline " +
        "(data → signal → risk → execution) you already have in this kit.",
      sections: [
        {
          title: "Residual / factor stat arb",
          body:
            "Regress each stock's returns on factors (market, sector, size). Trade the residual when it stretches — " +
            "like pairs, but on many names at once.",
          bullets: [
            "Cross-sectional ranking: long top decile, short bottom decile on a signal.",
            "Requires neutralizing unwanted factor bets so you are not just long momentum.",
          ],
        },
        {
          title: "Momentum + mean reversion blend",
          body:
            "Trend on slow horizons, fade extremes on fast horizons. The trick is non-overlapping signals and clear risk budgets per sleeve.",
          bullets: [
            "Example: 12-month momentum filter + 5-day mean reversion entry.",
            "Correlation between sleeves spikes in crises — size accordingly.",
          ],
        },
        {
          title: "Volatility targeting",
          body:
            "Scale position size inversely to realized volatility so each bet contributes similar risk. " +
            "Common overlay on any alpha signal.",
          bullets: [
            "position ∝ signal_strength / realized_vol",
            "Reduces blow-ups when vol clusters (2008, 2020).",
          ],
        },
        {
          title: "Basket / ETF arbitrage",
          body:
            "Trade ETF vs constituents or vs futures when fair-value diverges. Latency-sensitive at the micro level; " +
            "slower versions exist on daily bars for learning.",
          bullets: [
            "Creation/redemption mechanism anchors ETF price.",
            "Borrow and corporate actions add operational complexity.",
          ],
        },
        {
          title: "How to practice safely",
          body: "Use the kit's simulated broker and RiskGate before any paper or live account.",
          bullets: [
            "One change at a time: new signal, then sizing, then costs model.",
            "Walk-forward backtests and paper trading for weeks, not hours.",
            "Document when the edge breaks — journals in the quest studio help.",
          ],
          callout: "File: hedgekit/risk/gate.py",
        },
      ],
      note: "Vocabulary and research directions only — not trade recommendations.",
    },
    {
      id: "stat-arb",
      title: "Statistical arbitrage (study guide)",
      summary:
        "Stat arb is a family of strategies that bet on statistical relationships in prices — spreads, factors, or baskets — " +
        "often with many small bets and heavy risk controls. Firms rarely rely on one indicator; they run portfolios of edges.",
      sections: [
        {
          title: "What statistical arbitrage means",
          body:
            "Loosely: trade when a quantity you model (spread, residual, factor exposure) looks unusually far from its typical range, " +
            "and expect convergence — not because you \"know\" the next tick, but because history suggests the relationship is stable.",
          bullets: [
            "Not one formula — it is a workflow: research → model → risk → execution → monitoring.",
            "Often market-neutral-ish: long and short legs to reduce broad market direction.",
            "Lives or dies on costs, capacity, and regime change (relationships break).",
          ],
        },
        {
          title: "How it connects to this kit",
          body:
            "The example mean-reversion strategy is a toy version of one stat-arb idea on a single symbol. The pairs lesson you just read " +
            "is the two-name version of the same spread-and-z-score workflow. Real desks combine dozens of signals.",
          callout: "This repo: one symbol z-score in strategies/example_mean_reversion/",
        },
        {
          title: "Common stat-arb patterns (vocabulary)",
          body: "You will see these in books, papers, and interview questions:",
          bullets: [
            "Pairs / basket spreads — trade divergence between related instruments (cointegration, beta hedging).",
            "Residual / factor stat arb — regress returns on factors, trade the leftover residual when stretched.",
            "Index arbitrage — ETF vs futures vs basket (latency-sensitive; more HFT-leaning).",
            "Cross-sectional — rank many stocks by a signal, long winners / short losers (rebalance frequently).",
          ],
        },
        {
          title: "Research habits that matter",
          body: "Before any live capital, systematic traders usually stress-test the statistical story:",
          bullets: [
            "Stationarity & half-life — does the spread actually mean-revert, and how fast?",
            "Transaction costs — commissions, spread, borrow fees on shorts, market impact.",
            "Out-of-sample tests — train on one period, validate on another; avoid look-ahead bias.",
            "Regime risk — mergers, halts, macro shocks can break relationships for months.",
          ],
        },
        {
          title: "Risk in stat arb desks",
          body:
            "Gross exposure can look small (long vs short) while hidden risks remain: factor tilts, crowding, liquidity, " +
            "and correlation spikes in stress. Shops use limits, stress tests, and kill switches — like this kit's RiskGate, but enterprise-scale.",
          callout: "File: hedgekit/risk/gate.py (educational simplified gate)",
        },
      ],
      note:
        "Educational overview only. Not financial advice. Past simulated or research results do not guarantee future performance.",
    },
    {
      id: "live-architecture",
      title: "Live trading stack (how many funds wire it)",
      summary:
        "Production systematic trading is usually many small Python (or C++) services talking through an event bus, " +
        "running on cloud VMs or Kubernetes, with a broker API (e.g. Interactive Brokers) at the edge. " +
        "Your home kit collapses this into one process for learning.",
      flow: [
        {
          label: "Market data",
          body:
            "Exchanges and vendors stream quotes, trades, and reference data. Feeds may arrive via FIX, proprietary APIs, or files. " +
            "Normalization (same symbols, timestamps, time zones) happens early.",
          tech: ["Exchange/vendor APIs", "FIX", "S3 flat files", "Time-series DB"],
        },
        {
          label: "Kafka",
          body:
            "Apache Kafka is the event backbone many shops use: durable topics for ticks, bars, signals, orders, and fills. " +
            "Multiple consumers read the same stream without blocking producers. (This is the streaming \"K\" — not Kubernetes.)",
          tech: ["Apache Kafka", "Schema registry", "ksqlDB / Flink (optional)"],
        },
        {
          label: "Python services",
          body:
            "Strategy research often starts in Python (pandas, numpy). Live, teams run worker processes that subscribe to Kafka, " +
            "compute features, emit OrderIntent-like messages, and log everything. Some paths use C++ for ultra-low latency; Python is common for mid-frequency.",
          tech: ["Python 3", "pandas / numpy", "venv or containers", "hedgekit-style modules"],
        },
        {
          label: "Risk & OMS",
          body:
            "Risk checks run before orders leave the building: position limits, notional, fat-finger, kill switch. " +
            "An OMS (order management system) tracks parent/child orders, routes, and audit trails.",
          tech: ["Risk service", "OMS", "Limits DB", "KILL_SWITCH"],
        },
        {
          label: "IBKR / broker",
          body:
            "Interactive Brokers (IBKR) is a common retail and small-fund gateway: TWS, IB Gateway, and the ib_insync / ibapi Python bindings. " +
            "Paper trading uses the same API with a paper account. Production connects over VPN or colo depending on setup.",
          tech: ["IB Gateway", "TWS API", "ib_insync", "Paper vs live accounts"],
        },
        {
          label: "AWS + Kubernetes",
          body:
            "Cloud deploys often use AWS: VPC, ECS or EKS (Kubernetes), RDS/Postgres, S3 for logs, Secrets Manager for keys. " +
            "Kubernetes (the orchestration \"K\") schedules containers, restarts crashed pods, and rolls out new strategy versions.",
          tech: ["AWS VPC", "EKS/ECS", "Kubernetes", "Terraform", "CloudWatch"],
        },
        {
          label: "Monitoring",
          body:
            "Dashboards, alerts, and structured logs tie it together: PnL, exposure, feed gaps, reject rates. " +
            "On-call engineers page when Kafka lag spikes or the broker disconnects.",
          tech: ["Grafana / Datadog", "PagerDuty", "Structured JSON logs"],
        },
      ],
      kafkaVsK8s: {
        kafkaTitle: "Kafka (streaming bus)",
        kafkaBody:
          "Moves events between systems — market ticks, signals, orders. Durable log you can replay. " +
          "Think: \"who heard this message, and when?\"",
        k8sTitle: "Kubernetes (container ops)",
        k8sBody:
          "Runs and restarts your services in Docker containers, scales replicas, rolling deploys. " +
          "Think: \"where does this Python process run, and how do I ship v2?\"",
      },
      roles: [
        { name: "Market data service", role: "Ingest, clean, publish bars/ticks to Kafka." },
        { name: "Strategy worker", role: "Consume bars, emit target positions or orders." },
        { name: "Risk service", role: "Approve or reject each order; enforce limits." },
        { name: "Execution / router", role: "Translate approved intents to broker API calls." },
        { name: "IB Gateway", role: "Broker-side session; maps API to exchanges." },
        { name: "Batch / research", role: "Offline backtests on S3 history; not in the hot path." },
      ],
      note:
        "Diagrams vary by firm. This is a teaching composite, not a blueprint for any specific fund. " +
        "Not financial advice. Running live systems requires compliance, security, and capital you can afford to lose.",
    },
  ],

  glossary: [
    {
      term: "Bar (OHLCV)",
      def: "One period of market data: open, high, low, close, volume. The kit uses daily bars by default.",
    },
    {
      term: "Mean reversion",
      def: "The idea that a price may return toward a recent average after an unusually large move. Can fail for years in trends.",
    },
    {
      term: "Z-score",
      def: "How many standard deviations the latest value is from the mean of a window. Used as a simple scale-free signal.",
    },
    {
      term: "Pairs trading",
      def: "Trading the spread between two correlated instruments rather than betting on one direction of a single stock.",
    },
    {
      term: "Cointegration",
      def: "A statistical notion that two price series share a stable long-run relationship so their spread may be mean-reverting.",
    },
    {
      term: "Simulated fill",
      def: "A fake fill generated by the kit's SimulatedBroker. No broker API call and no real money.",
    },
    {
      term: "Risk gate",
      def: "Pre-trade checks: max position, gross exposure, daily loss, max trades per day, kill switch.",
    },
    {
      term: "OrderIntent",
      def: "What the strategy wants to do (symbol, side, quantity, limit price) before risk and broker see it.",
    },
    {
      term: "Look-ahead bias",
      def: "Accidentally using future data in a backtest. Makes results look better than achievable live.",
    },
    {
      term: "Paper trading",
      def: "Broker's practice environment (e.g. IBKR paper). Real API, fake money. Optional in this kit.",
    },
    {
      term: "Statistical arbitrage",
      def: "Strategies that exploit statistical relationships (spreads, residuals, baskets), often many small bets with risk controls — not a single magic formula.",
    },
    {
      term: "Market neutral",
      def: "Roughly balanced long and short exposure so broad market moves matter less; basis and factor risk still remain.",
    },
    {
      term: "Apache Kafka",
      def: "Distributed event log many funds use to stream market data, signals, and orders between services. The streaming \"K\" — not Kubernetes.",
    },
    {
      term: "Kubernetes",
      def: "Container orchestrator (often on AWS EKS) that runs and restarts trading services. The infrastructure \"K\" — not Kafka.",
    },
    {
      term: "OMS",
      def: "Order management system: tracks orders, routes, fills, and audit trail between strategies and the broker.",
    },
    {
      term: "IBKR / IB Gateway",
      def: "Interactive Brokers API path used by many Python traders; paper or live accounts via Gateway or TWS.",
    },
    {
      term: "Half-life (spread)",
      def: "How fast a mean-reverting spread typically closes; central to sizing and holding period in stat arb.",
    },
    {
      term: "Hedge ratio",
      def: "Beta from regressing one leg on the other; scales the short leg so the spread is roughly market-neutral.",
    },
    {
      term: "Engle-Granger test",
      def: "A classic cointegration test: regress one series on another, then test if residuals are stationary (ADF).",
    },
    {
      term: "Dollar neutrality",
      def: "Balancing notional long vs short so a parallel move in both names does not dominate PnL.",
    },
  ],

  resources: [
    {
      title: "Algorithmic Trading — Ernie Chan",
      type: "book",
      note: "Clear intro to mean reversion, pairs, and backtest pitfalls. Good first read after this site.",
      url: "https://www.wiley.com/en-us/Algorithmic+Trading%3A+Winning+Strategies+and+Their+Rationale-p-9781118460146",
    },
    {
      title: "Pairs Trading — Ganapathy Vidyamurthy",
      type: "book",
      note: "Dedicated pairs framework: cointegration, spread modeling, risk.",
      url: "https://www.wiley.com/en-us/Pairs+Trading%3A+Quantitative+Methods+and+Analysis-p-9780471460671",
    },
    {
      title: "Quantitative Trading — Ernie Chan",
      type: "book",
      note: "Broader stat-arb workflow from idea to implementation.",
      url: "https://www.wiley.com/en-us/Quantitative+Trading%3A+How+to+Build+Your+Own+Algorithmic+Trading+Business%2C+2nd+Edition-p-9781119803774",
    },
    {
      title: "Advances in Financial Machine Learning — Marcos López de Prado",
      type: "book",
      note: "Meta-labeling, bet sizing, and avoiding false discoveries in research.",
      url: "https://www.wiley.com/en-us/Advances+in+Financial+Machine+Learning-p-9781119482086",
    },
    {
      title: "This repo — example pairs strategy",
      type: "code",
      note: "strategies/example_pairs/ — two-leg z-score spread with OLS beta.",
      url: "https://github.com/ashlynbain/hedge-fund-at-home/tree/main/strategies/example_pairs",
    },
    {
      title: "statsmodels — cointegration",
      type: "docs",
      note: "Engle-Granger and ADF tests when you graduate from toy spreads.",
      url: "https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.coint.html",
    },
  ],

  codeLab: {
    intro:
      "Run whitelisted Python teaching snippets on the server. Adjust parameters, press Run, read stdout. " +
      "Simulated / educational only — not financial advice.",
    snippets: [
      {
        id: "pairs_demo",
        title: "Pairs spread report",
        description: "Compute hedge ratio, spread z-score, and half-life on a teaching pair.",
        action: "pairs_demo",
        params: [
          { name: "pair", type: "select", default: "ko_pep", options: ["ko_pep", "xom_cvx", "gld_gdx"] },
          { name: "lookback", type: "number", default: 60, min: 20, max: 200 },
          { name: "entry_z", type: "number", default: 2.0, min: 0.5, max: 4, step: 0.1 },
          { name: "use_live", type: "checkbox", default: false, label: "Try live yfinance (falls back to synthetic)" },
        ],
      },
      {
        id: "hedge_ratio",
        title: "Hedge ratio walkthrough",
        description: "OLS beta on synthetic cointegrated data.",
        action: "run_snippet",
        snippetId: "hedge_ratio",
        params: [],
      },
      {
        id: "zscore_single",
        title: "Single-symbol z-score",
        description: "Same math as the mean reversion example on one price series.",
        action: "run_snippet",
        snippetId: "zscore_single",
        params: [],
      },
      {
        id: "run_once",
        title: "Kit: run once (simulated)",
        description: "Full pipeline — strategy, risk gate, simulated fill.",
        action: "run_once",
        params: [],
      },
      {
        id: "backtest",
        title: "Kit: simulated backtest",
        description: "Walk historical bars with the example mean reversion strategy.",
        action: "backtest",
        params: [
          { name: "start", type: "text", default: "2023-01-01" },
          { name: "end", type: "text", default: "2024-06-01" },
        ],
      },
    ],
  },

  expectedOutputs: [
    {
      id: "run-once",
      title: "Run once (simulated)",
      command: "python -m hedgekit.cli.run --once",
      whatToLookFor: [
        "strategy_loaded in logs",
        "runner_start with mode simulated",
        "simulated_fill when the strategy proposes orders",
        "No IBKR connection required",
      ],
      outputKey: "run-once",
    },
    {
      id: "backtest",
      title: "Simulated backtest",
      command: "python -m hedgekit.cli.backtest --start 2023-01-01 --end 2024-12-31",
      whatToLookFor: [
        "Table with bars evaluated, fills, risk rejects",
        "Fills are simulated counts, not P&L guarantees",
        "Reminder that this is not financial advice",
      ],
      outputKey: "backtest",
    },
    {
      id: "pytest",
      title: "Tests",
      command: "python -m pytest -q",
      whatToLookFor: ["Dots or pass count", "Exit code 0 when dev dependencies installed"],
      outputKey: "pytest",
    },
    {
      id: "pairs-demo",
      title: "Pairs spread demo",
      command: "python -m hedgekit.cli.render_serve  # then use Code lab → Pairs spread report",
      whatToLookFor: [
        "Hedge ratio (OLS beta)",
        "Spread z-score and half-life estimate",
        "Teaching signal sketch (long/short legs)",
      ],
      outputKey: "pairs-demo",
    },
  ],

  setupGuide: {
    title: "Clone the repo & paper trade",
    summary:
      "Follow these steps on GitHub after you clone. Backtest on sample Yahoo data, then connect your broker (paper), " +
      "cloud, and data feed. IBKR and AWS scaffolds are included; other vendors use the placeholder adapters.",
    githubDocs: [
      { label: "Doc index", path: "docs/README.md" },
      { label: "Paper trading setup", path: "docs/PAPER_TRADING_SETUP.md" },
      { label: "Broker adapters", path: "hedgekit/broker/README.md" },
      { label: "Market data", path: "hedgekit/data/README.md" },
      { label: "IBKR paper lab", path: "docs/IBKR_SETUP.md" },
      { label: "Cloud & AWS", path: "infrastructure/README.md" },
      { label: "Example config", path: "config/config.yaml.example" },
    ],
    phases: [
      {
        id: "local",
        title: "1. Local kit (no broker yet)",
        summary: "Everyone starts here. Simulated mode only — no exchange, no cloud required.",
        steps: [
          {
            title: "Clone the repo",
            body: "Fork or clone the GitHub repository, then work in the project root — the folder that contains pyproject.toml after you cd in.",
            code: "git clone https://github.com/ashlynbain/hedge-fund-at-home.git\ncd hedge-fund-at-home",
          },
          {
            title: "Create venv & install",
            body: "Python 3.11+. Editable install pulls in pandas, yfinance, ib_insync, and the hedgekit package.",
            code: "python -m venv .venv && source .venv/bin/activate\npip install -e \".[dev]\"",
          },
          {
            title: "Copy config templates",
            body: "config.yaml drives strategy, risk limits, and execution mode. .env holds secrets locally.",
            code: "cp .env.example .env\ncp config/config.yaml.example config/config.yaml",
            callout: "Default mode: simulated — safe for learning",
          },
          {
            title: "Run once (simulated)",
            body: "You should see strategy_loaded and simulated_fill in JSON logs. No broker credentials needed.",
            code: "python -m hedgekit.cli.run --once",
          },
          {
            title: "Sample data (default)",
            body: "Daily bars come from Yahoo Finance (yfinance) for symbols in config.yaml — no API key. Swap fetch_daily_bars() when you have your own feed.",
            callout: "hedgekit/data/README.md",
          },
          {
            title: "Backtest walk",
            body: "Historical simulated walk — counts fills and risk rejects. Still not a performance forecast.",
            code: "python -m hedgekit.cli.backtest --start 2023-01-01 --end 2024-12-31",
          },
        ],
      },
      {
        id: "broker",
        title: "2. Connect a broker (paper first)",
        summary:
          "Execution mode in config.yaml: simulated → paper → live. Interactive Brokers (IBKR) is included. " +
          "Other brokers: copy custom_broker.py.example and set BROKER_ADAPTER=custom in .env.",
        steps: [
          {
            title: "Pick your broker path",
            body:
              "IBKR is built in (ib_insync). Alpaca, Tradier, Schwab, etc. are not shipped — add a module that translates OrderIntent to their API.",
            callout: "Educational default: stay on simulated until you can trace runner.py end-to-end",
          },
          {
            title: "IBKR: install TWS or IB Gateway",
            body: "Download from Interactive Brokers. Enable API connections in settings. Use a paper account for the lab.",
            callout: "docs/IBKR_SETUP.md in the repo",
          },
          {
            title: "IBKR: paper ports & .env",
            body: "Paper TWS default 7497, live 7496, Gateway paper 4002. Set IBKR_USE_REAL=true only when Gateway/TWS is running.",
            code: "IBKR_HOST=127.0.0.1\nIBKR_PORT=7497\nIBKR_CLIENT_ID=1\nIBKR_USE_REAL=true\nENABLE_LIVE_TRADING=false",
          },
          {
            title: "Switch config to paper mode",
            body: "mode: paper sends approved orders to IBKR when use_real is true. Keep ENABLE_LIVE_TRADING=false.",
            code: "mode: paper\nibkr:\n  host: ${IBKR_HOST:-127.0.0.1}\n  port: ${IBKR_PORT:-7497}\n  use_real: true",
          },
          {
            title: "Smoke test paper session",
            body: "Start TWS/Gateway, then run one cycle. Watch logs for broker connectivity errors before leaving it unattended.",
            code: "python -m hedgekit.cli.run --once",
          },
          {
            title: "Your broker (placeholder)",
            body: "Copy custom_broker.py.example, implement submit(), set BROKER_ADAPTER=custom and BROKER_CUSTOM_MODULE in .env.",
            code: "BROKER_ADAPTER=custom\nBROKER_CUSTOM_MODULE=my_brokers.alpaca:MyPaperBroker",
            callout: "hedgekit/broker/custom_broker.py.example",
          },
        ],
        brokers: [
          {
            name: "Interactive Brokers",
            status: "Shipped",
            detail: "ib_insync adapter in hedgekit/broker/ibkr.py. Paper & live via TWS/Gateway.",
            ports: "Paper 7497 · Live 7496 · Gateway 4002",
          },
          {
            name: "Alpaca / Tradier / others",
            status: "DIY",
            detail: "Implement BrokerClient + REST/WebSocket for that vendor. Keep simulated mode for unit tests.",
          },
          {
            name: "Simulated (default)",
            status: "Shipped",
            detail: "hedgekit/broker/simulated.py — immediate fake fills. No API keys.",
          },
        ],
      },
      {
        id: "cloud",
        title: "3. Cloud account (secrets & runner)",
        summary:
          "Run the same Python process on a VM or container. AWS Terraform is included; GCP/Azure use the same env-var pattern.",
        steps: [
          {
            title: "Why cloud at all?",
            body:
              "Uptime, secrets management, and logs — not alpha. Many home quants start on a laptop in simulated mode, then move the runner to a small VPS or ECS task.",
          },
          {
            title: "AWS (included in repo)",
            body: "Terraform under infrastructure/aws/: Secrets Manager, ECS Fargate cluster, IAM, CloudWatch logs.",
            code: "cd infrastructure/aws\ncp terraform.tfvars.example terraform.tfvars\nterraform init && terraform apply",
            callout: "docs/AWS_SETUP.md",
          },
          {
            title: "Load secrets into the runner",
            body: "Store IBKR host/port/client id as JSON in Secrets Manager. Enable with AWS_SECRETS_ENABLED=true.",
            code: "AWS_SECRETS_ENABLED=true\nAWS_REGION=us-east-1\nAWS_SECRETS_NAME=hedge-fund-at-home/dev",
          },
          {
            title: "Docker (any cloud)",
            body: "docker-compose.yml runs the simulated runner. Push the image to ECR, GCR, or Docker Hub for your platform.",
            code: "docker compose up --build",
            callout: "docker/Dockerfile",
          },
          {
            title: "GCP / Azure / other VPS",
            status: "Pattern",
            body:
              "No Terraform shipped — use a VM or Cloud Run/Container Apps. Inject the same .env keys via Secret Manager, Key Vault, or encrypted env. " +
              "IBKR still needs a network path to TWS/Gateway (often VPN or a bridge host).",
          },
        ],
        clouds: [
          { name: "AWS", status: "Shipped", detail: "Terraform: ECS + Secrets Manager + CloudWatch" },
          { name: "Docker anywhere", status: "Shipped", detail: "docker-compose for local or registry push" },
          { name: "GCP", status: "DIY", detail: "Secret Manager + Cloud Run / GCE — same env vars" },
          { name: "Azure", status: "DIY", detail: "Key Vault + Container Apps / VM — same env vars" },
          { name: "VPS / home server", status: "DIY", detail: "systemd or cron + .env on the machine" },
        ],
      },
      {
        id: "guardrails",
        title: "4. Guardrails before real capital",
        summary: "Live trading is gated behind mode: live and ENABLE_LIVE_TRADING=true. The learning path does not require it.",
        steps: [
          {
            title: "Complete simulated + paper checkpoints",
            body: "Finish LEARNING_PATH stages 1–6. Paper trade for weeks. Document when the strategy breaks.",
          },
          {
            title: "RiskGate limits",
            body: "Tune max_position, gross exposure, daily loss, max trades, and KILL_SWITCH in config.yaml.",
            callout: "hedgekit/risk/gate.py",
          },
          {
            title: "Live mode (discouraged without oversight)",
            body: "Requires explicit env flag. Treat as production — compliance, taxes, and capital you can lose.",
            code: "mode: live\nENABLE_LIVE_TRADING=true  # only after professional review",
          },
          {
            title: "Read the disclaimer",
            body: "Educational software. Past simulated or backtest results do not predict live performance.",
            callout: "DISCLAIMER.md",
          },
        ],
      },
    ],
    note:
      "Clone the repo on GitHub for the runnable kit. Sample Yahoo data and placeholders for your broker, cloud, and stack. " +
      "Not financial advice. Paper test for weeks before considering anything beyond paper.",
  },

  handsOn: {
    title: "Clone the repo (paper-trading kit)",
    steps: [
      "git clone https://github.com/ashlynbain/hedge-fund-at-home.git",
      "cd hedge-fund-at-home",
      "python -m venv .venv && source .venv/bin/activate",
      'pip install -e ".[dev]"',
      "cp .env.example .env && cp config/config.yaml.example config/config.yaml",
      "python -m hedgekit.cli.run --once  # simulated smoke test",
      "Read docs/PAPER_TRADING_SETUP.md → connect your broker (paper) & cloud",
    ],
  },
};

/** @deprecated legacy alias for older static uploads */
window.HFAH_HOSTINGER = window.HFAH_LEARN;
