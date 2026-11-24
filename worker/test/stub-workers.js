// Stands in for the `cloudflare:workers` module when the login server runs under Node in tests.
export class DurableObject {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
}
