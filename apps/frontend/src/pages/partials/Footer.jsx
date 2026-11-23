import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';

const Footer = () => {
    return (
        <Navbar className='footer'>
            <Container>
                <div className='d-flex flex-wrap align-items-center justify-content-center w-100 text-center'>
                    2023 <span className='fw-bold fst-italic mx-2 vm-center'>
                        <img
                            alt=""
                            src="/images/favicon.png"
                            width="17"
                            className="d-inline-block"
                            style={{ marginRight: '-1px', marginTop: '-1px' }}
                        />Videomaker
                    </span>  for
                    <a href="https://se360.se/" target="_blank" rel="noopener noreferrer" className='fw-bold fst-italic mx-2'> SE360</a>
                    created by
                    <a href="https://www.linkedin.com/in/glafver/" target="_blank" rel="noopener noreferrer" className='fw-bold glafver'> glafver</a>
                </div>
            </Container>
        </Navbar>
    );
};

export default Footer;