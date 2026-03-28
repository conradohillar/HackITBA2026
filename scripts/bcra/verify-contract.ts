// @ts-nocheck
const resourceCandidates = {
  deudores: ['/deudores', '/situacion'],
  historicas: ['/historicas', '/historico'],
  cheques: ['/cheques', '/chequesrechazados'],
};

const baseUrl = process.env.BCRA_API_BASE_URL ?? 'https://api.bcra.gob.ar/centraldedeudores/v1.0';
const timeoutMs = 5_000;

function normalizeCuit(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function buildUrl(path, cuit) {
  const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('cuit', cuit);
  return url.toString();
}

async function probeResource(resource, cuit) {
  const attemptedPaths = [];

  for (const path of resourceCandidates[resource]) {
    attemptedPaths.push(path);

    try {
      const response = await fetch(buildUrl(path, cuit), {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok || response.status !== 404) {
        return {
          resource,
          reachable: response.ok,
          status: response.status,
          matchedPath: path,
          attemptedPaths,
          contentType: response.headers.get('content-type'),
        };
      }
    } catch (error) {
      return {
        resource,
        reachable: false,
        status: 0,
        matchedPath: path,
        attemptedPaths,
        contentType: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return {
    resource,
    reachable: false,
    status: 404,
    matchedPath: null,
    attemptedPaths,
    contentType: null,
  };
}

async function main() {
  const cuit = normalizeCuit(process.env.BCRA_VERIFY_CUIT ?? '30712345678');
  const resources = await Promise.all(Object.keys(resourceCandidates).map((resource) => probeResource(resource, cuit)));

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        cuit,
        baseUrl,
        resources,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('BCRA contract verification failed.');
  console.error(error);
  process.exit(1);
});
