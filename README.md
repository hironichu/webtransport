# Webtransport

A QUIC+Webtransport server abstraction for Deno

> Module still in development relying on unstable feature in Deno 2.0.3+, do not
> use in production.

This module aims to have a tiny amount of abstraction to manage clients
connection in Deno, using no dependencies and very tiny codebase.

It is aimed to be used in server application that want to receive and manage
both QUIC and Webtransport connection simultanously.
