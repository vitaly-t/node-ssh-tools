// Copyright (c) 2019-present, Anton Makarov <zer0c14@gmail.com>
// See the LICENSE for more information.

import { ReadStream, WriteStream } from 'tty';
import { injectable } from 'inversify';
import { ClientChannel } from 'ssh2';
import SshClient from 'ssh2-promise';

/**
 * Terminal shell interface.
 */
export interface ITerminalShell {
  run(sshClient: SshClient, options): Promise<ClientChannel>;
}

/**
 * Terminal shell run options interface.
 */
export interface ITerminalShellRunOptions {
  stdin: ReadStream;
  stdout: WriteStream;
  stderr: WriteStream;
  environments?: { [name: string]: string };
}

@injectable()
export class TerminalShell {
  /**
   * Runs terminal interactive shell.
   *
   * @param sshClient
   * @param options
   */
  public async run(
    sshClient: SshClient,
    options: ITerminalShellRunOptions,
  ): Promise<ClientChannel> {
    const { stdin, stdout, stderr, environments = {} } = options;
    const envs = this.environmentsToCommandString(environments);

    const stream = await sshClient.spawn(`${envs} $SHELL`, [], { pty: true });
    stream.on('close', () => {
      stream.stderr.unpipe(stderr);
      stdin.unpipe(stream).unpipe(stdout);
      stdin.setRawMode(false);
      sshClient.close();
    });

    stdin.setRawMode(true);
    stdin.pipe(stream).pipe(stdout);
    stream.stderr.pipe(stderr);

    return stream;
  }

  /**
   * Convert environments to command string.
   *
   * @param environments
   */
  protected environmentsToCommandString(environments: {}): string {
    return Object.entries(environments)
      .map(_ => _.join('='))
      .join(' ');
  }
}
