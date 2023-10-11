/**
 * Generates the URL for a given domain and protocol.
 *
 * @param {string} protocol - The protocol to be used (defaults to "http").
 * @param {string} domain - The domain to be used (defaults to "localhost:3000").
 * @return {string} The generated URL.
 */
export function getDomain(
  protocol: string = "http",
  domain: string = "localhost:3000"
) {
  const environment = process.env.NEXT_PUBLIC_VERCEL_ENV;
  const protocolMapping: { [key: string]: string } = {
    production: "https",
    development: "http",
  };
  const selectedProtocol = protocolMapping[environment] || protocol;
  const selectedDomain = process.env.PUBLIC_URL || domain;

  if (!selectedProtocol || !selectedDomain) {
    throw new Error("Invalid environment variables.");
  }

  return `${selectedProtocol}://${selectedDomain}`;
}
