rt.spawn(async move{
	for _id in 0.. {
		let incoming_session = self.server.as_mut().unwrap().accept().await;
		let mut buffer = vec![0; 65536].into_boxed_slice();

		println!("Waiting for session request...");
		let session_request = incoming_session.await;
		// println!("Session request received ID : {}", id);
		let session_request = match session_request {
			Ok(sessreq) => sessreq,
			Err(e) => {
				println!("Error accepting session request: {:?}", e);
				continue ;
			}
		};
		println!(
			"New session: Authority: '{}', Path: '{}'",
			session_request.authority(),
			session_request.path()
		);
	
		let connection = session_request.accept().await.unwrap();
	
		println!("Waiting for data from client...");
		
		executor::spawn(async move {
			loop {
				tokio::select! {
					// stream = connection.accept_bi() => {
					// 	match stream {
					// 		Ok(mut stream) => {

					// 			println!("Accepted BI stream");
					// 			let bytes_read = stream.1.read(&mut buffer).await.unwrap().unwrap();
					// 			let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();
				
					// 			println!("Received (bi) '{str_data}' from client");

					// 			stream.0.write_all(b"ACK").await.unwrap();
					// 		},
					// 		Err(e) => {
					// 			break ;
					// 		}
					// 	};

					// }
					// stream = connection.accept_uni() => {
					// 	// let mut stream = stream;
					// 	match stream {
					// 		Ok(mut stream) => {
					// 			println!("Accepted UNI stream");
					// 			let bytes_read = match stream.read(&mut buffer).await.unwrap() {
					// 				Some(bytes_read) => bytes_read,
					// 				None => continue,
					// 			};
				
					// 			let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();
				
					// 			println!("Received (uni) '{str_data}' from client");
				
					// 			let mut stream = connection.open_uni().await.unwrap().await.unwrap();
					// 			stream.write_all(b"ACK").await.unwrap();
					// 		},
					// 		_ => {
					// 			// println!("Error accepting UNI stream: {:?}", e);
					// 			break ;
					// 		}
					// 	}

					// }
					dgram = connection.receive_datagram() => {
						match dgram {
							Ok(dgram) => {
								println!("Received datagram from client");
								let str_data = std::str::from_utf8(&dgram).unwrap();
								println!("Received (dgram) '{str_data}' from client");
								connection.send_datagram(b"ACK").unwrap();
							},
							_ => {
								// break;
								break ;
							}
						}
					}
				}
			}
		}).detach();

	}
});

pub fn handle_incoming(&'static mut self, connection: Connection) {
	// executor::spawn(async move {
	// 	loop {
	// 		let sender = self.datagram_ch_sender.as_ref().unwrap();
	// 		tokio::select! {
	// 			// stream = connection.accept_bi() => {
	// 			// 	match stream {
	// 			// 		Ok(mut stream) => {

	// 			// 			println!("Accepted BI stream");
	// 			// 			let bytes_read = stream.1.read(&mut buffer).await.unwrap().unwrap();
	// 			// 			let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();
			
	// 			// 			println!("Received (bi) '{str_data}' from client");

	// 			// 			stream.0.write_all(b"ACK").await.unwrap();
	// 			// 		},
	// 			// 		Err(e) => {
	// 			// 			break ;
	// 			// 		}
	// 			// 	};

	// 			// }
	// 			// stream = connection.accept_uni() => {
	// 			// 	// let mut stream = stream;
	// 			// 	match stream {
	// 			// 		Ok(mut stream) => {
	// 			// 			println!("Accepted UNI stream");
	// 			// 			let bytes_read = match stream.read(&mut buffer).await.unwrap() {
	// 			// 				Some(bytes_read) => bytes_read,
	// 			// 				None => continue,
	// 			// 			};
			
	// 			// 			let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();
			
	// 			// 			println!("Received (uni) '{str_data}' from client");
			
	// 			// 			let mut stream = connection.open_uni().await.unwrap().await.unwrap();
	// 			// 			stream.write_all(b"ACK").await.unwrap();
	// 			// 		},
	// 			// 		_ => {
	// 			// 			// println!("Error accepting UNI stream: {:?}", e);
	// 			// 			break ;
	// 			// 		}
	// 			// 	}

	// 			// }
	// 			dgram = connection.receive_datagram() => {
	// 				match dgram {
	// 					Ok(dgram) => {
	// 						sender.send_async(dgram).await.unwrap();
	// 						// println!("Received datagram from client");
	// 						// let str_data = std::str::from_utf8(&dgram).unwrap();
	// 						// println!("Received (dgram) '{str_data}' from client");
	// 						// connection.send_datagram(b"ACK").unwrap();
	// 					},
	// 					_ => {
	// 						// break;
	// 						break ;
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}
	// }).detach();
	// println!("Waiting for session request...");
	// executor::spawn(async move {
	//     let receiver = self.conn_ch_receiver.as_mut().unwrap();
	//     let next = {
	//         let to_client_receiver_next = receiver.recv_async().fuse();
	//         let session_request = incoming_session.fuse();

	//         pin_mut!(to_client_receiver_next);
	//         pin_mut!(session_request);
	//         select! {
	//             from_client_result = session_request => {
	//                 let sess_req = from_client_result.unwrap();
	//                 println!("Session request received {}", sess_req.authority());
	//                 Next::NewSessionRequest(sess_req)
	//             }
	//         }
	//     };
	//     match next {
	//         Next::NewSessionRequest(sessreq) => {
	//             println!("Received datagram from client: {:?}", sessreq.authority());
	//         }

	//     }
	// }).detach();
}