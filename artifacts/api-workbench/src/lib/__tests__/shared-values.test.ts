import { describe, expect, it } from 'vitest';
import {
  looksSecret,
  rememberLocal,
  restoreLocal,
  shareKey,
  shareRows,
  shares,
  suggestShared,
} from '@/lib/shared-values';
import { createEnvironment, row } from '@/lib/factories';
import type { Environment } from '@/types';

function environment(name: string, variables: Array<[string, string]>, id = `env_${name}`): Environment {
  return {
    ...createEnvironment('ws', name, name === 'Base', variables.map(([key, value]) => row(key, value))),
    id,
  };
}

describe('looksSecret', () => {
  it('catches the names a credential actually goes by', () => {
    for (const name of [
      'token',
      'apiToken',
      'API_KEY',
      'x-auth-key',
      'authorization',
      'bearer',
      'password',
      'passwd',
      'pwd',
      'clientSecret',
      'privateKey',
      'sessionId',
      'jwt',
      'signature',
      'oauthToken',
      'cookie',
      'credentials',
    ]) {
      expect(looksSecret(name), name).toBe(true);
    }
  });

  it('catches them in the other two languages the app speaks', () => {
    for (const name of ['senha', 'senhaAdmin', 'contraseña', 'clave', 'clave_api', 'segredo', 'credencial']) {
      expect(looksSecret(name), name).toBe(true);
    }
  });

  it('leaves an ordinary name alone', () => {
    for (const name of ['baseUrl', 'host', 'port', 'userId', 'version', 'pokemonId', 'limit', 'dataEntrada']) {
      expect(looksSecret(name), name).toBe(false);
    }
  });

  it('does not fire on a word that merely contains one', () => {
    // `monkey` holds `key`. A false positive costs nothing but it does cost
    // trust in the guess, and the guess is shown to a person.
    for (const name of ['monkey', 'keyword', 'keyboard', 'passenger', 'compass']) {
      expect(looksSecret(name), name).toBe(false);
    }
  });
});

describe('suggestShared', () => {
  it('shares the ordinary values and holds back the credentials', () => {
    const environments = [environment('Base', [['baseUrl', 'https://pokeapi.co'], ['token', 'abc']])];
    const shared = suggestShared(environments);

    expect(shared.has(shareKey('env_Base', 'baseUrl'))).toBe(true);
    expect(shared.has(shareKey('env_Base', 'token'))).toBe(false);
  });

  it('keeps environments apart, since the same name means different things', () => {
    const environments = [
      environment('Base', [['baseUrl', 'https://pokeapi.co']]),
      environment('Local', [['baseUrl', 'http://localhost:3000']]),
    ];
    const shared = suggestShared(environments);
    expect(shared.has(shareKey('env_Base', 'baseUrl'))).toBe(true);
    expect(shared.has(shareKey('env_Local', 'baseUrl'))).toBe(true);
    // Same name, different keys, so either can be turned off alone.
    expect(shared.size).toBe(2);
  });

  it('ignores the blank row the table keeps at the end', () => {
    expect(suggestShared([environment('Base', [['', '']])]).size).toBe(0);
  });
});

describe('shareRows', () => {
  it('says of each variable whether it travels, and why it was guessed', () => {
    const environments = [environment('Base', [['baseUrl', 'https://x'], ['token', 'abc']])];
    const rows = shareRows(environments, suggestShared(environments));

    expect(rows).toHaveLength(2);
    const token = rows.find((item) => item.name === 'token')!;
    expect(token.shared).toBe(false);
    expect(token.looksSecret).toBe(true);
    expect(token.environmentName).toBe('Base');

    const base = rows.find((item) => item.name === 'baseUrl')!;
    expect(base.shared).toBe(true);
    expect(base.looksSecret).toBe(false);
  });

  it('shows the value, because that is what the reader is deciding about', () => {
    const environments = [environment('Base', [['baseUrl', 'https://x']])];
    expect(shareRows(environments, new Set())[0].value).toBe('https://x');
  });
});

describe('shares', () => {
  it('matches on the trimmed name, which is what the file writes', () => {
    const base = environment('Base', [['token ', 'abc']]);
    const shared = new Set([shareKey('env_Base', 'token')]);
    expect(shares(shared, base, base.variables[0])).toBe(true);
  });

  it('is false for anything nobody ticked', () => {
    const base = environment('Base', [['token', 'abc']]);
    expect(shares(new Set(), base, base.variables[0])).toBe(false);
  });
});

describe('keeping the values that are yours', () => {
  const base = environment('Base', [
    ['baseUrl', 'https://pokeapi.co'],
    ['token', 'my-own-token'],
  ]);
  const shared = new Set([shareKey('env_Base', 'baseUrl')]);

  it('remembers only what the project does not carry', () => {
    const kept = rememberLocal([base], shared, {});
    expect(kept).toEqual({ [shareKey('env_Base', 'token')]: 'my-own-token' });
  });

  it('does not remember a blank, which would blank the field on every pull', () => {
    const empty = environment('Base', [['token', '']]);
    expect(rememberLocal([empty], shared, {})).toEqual({});
  });

  it('keeps what it already knew about other environments', () => {
    const kept = rememberLocal([base], shared, { 'env_Other::token': 'theirs' });
    expect(kept['env_Other::token']).toBe('theirs');
  });

  it('puts your value back into what the directory produced', () => {
    // This is what makes "your token stays yours" survive more than one pull:
    // the file blanks it every time, and this fills it in again.
    const fromFile = environment('Base', [['baseUrl', 'https://pokeapi.co'], ['token', '']]);
    const restored = restoreLocal([fromFile], { [shareKey('env_Base', 'token')]: 'my-own-token' });
    expect(restored[0].variables.map((v) => v.value)).toEqual(['https://pokeapi.co', 'my-own-token']);
  });

  it('lets a value the project carries win over one you remembered', () => {
    // Somebody decided that one on purpose and committed it; a stale local
    // copy quietly overriding it is how you debug the wrong thing for an hour.
    const fromFile = environment('Base', [['baseUrl', 'https://new.example.com']]);
    const restored = restoreLocal([fromFile], { [shareKey('env_Base', 'baseUrl')]: 'https://old.example.com' });
    expect(restored[0].variables[0].value).toBe('https://new.example.com');
  });

  it('leaves a variable it has never seen alone', () => {
    const fromFile = environment('Base', [['newThing', '']]);
    expect(restoreLocal([fromFile], {})[0].variables[0].value).toBe('');
  });

  it('survives the round trip it exists for', () => {
    // Remember, pull (which blanks the local ones), restore.
    const kept = rememberLocal([base], shared, {});
    const afterPull = environment('Base', [['baseUrl', 'https://pokeapi.co'], ['token', '']]);
    const restored = restoreLocal([afterPull], kept);
    expect(restored[0].variables.find((v) => v.key === 'token')?.value).toBe('my-own-token');
  });
});
