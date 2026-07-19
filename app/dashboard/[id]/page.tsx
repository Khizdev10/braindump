const details = ({ params: { id } }: { params: { id: string } }) => {
    return (
        <div>
            <h1>Details</h1>
            <p>{id}</p>
        </div>
    );
}