const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET!;

export async function verifyCaptcha(token: string): Promise<boolean> {
  const res = await fetch("https://api.hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: HCAPTCHA_SECRET,
      response: token,
    }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
