use num_cpus;
use once_cell::sync::Lazy;
use smol::{block_on, future, Executor, Task};

use std::{future::Future, thread};

pub fn spawn<T: Send + 'static>(future: impl Future<Output = T> + Send + 'static) -> Task<T> {
  static GLOBAL: Lazy<Executor<'_>> = Lazy::new(|| {
    for n in 0..= num_cpus::get() {
      thread::Builder::new()
        .name(format!("ftlt-{}", n))
        .spawn(|| loop {
          block_on(GLOBAL.run(future::pending::<()>()))
        })
        .expect("cannot spawn executor thread");
    }

    Executor::new()
  });

  GLOBAL.spawn(future)
}
